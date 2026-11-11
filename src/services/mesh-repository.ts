import * as Crypto from 'expo-crypto';
import type { SQLiteDatabase } from 'expo-sqlite';

import { decideRelay, MESH_DEFAULT_TTL, MESH_ORIGIN_RATE_MAX, MESH_ORIGIN_RATE_WINDOW_MS, type RelayDecision } from '@/lib/mesh';
import { MESH_HISTORY_RETENTION_MS, pruneMeshRecords } from '@/db/mesh-retention';
import { withExclusiveDatabaseTransaction } from '@/db/write-transaction';
import { meshOriginPosition } from '@/lib/mesh-origin-payload';
import type { Coordinates, EmergencyType, MeshMessage, Severity } from '@/types/models';
import { signMeshOrigin, verifyMeshOrigin } from '@/services/mesh-integrity';

export async function createMeshMessage(options: {
  db: SQLiteDatabase;
  emergencyType: EmergencyType;
  position: Coordinates | null;
  severity: Severity;
}) {
  const id = Crypto.randomUUID();
  const unsigned: Omit<MeshMessage, 'originHash' | 'originPublicKey' | 'originSignature'> = {
    id,
    emergencyType: options.emergencyType,
    position: meshOriginPosition(options.position),
    createdAt: Date.now(),
    hopsRemaining: MESH_DEFAULT_TTL,
    initialTtl: MESH_DEFAULT_TTL,
    severity: options.severity,
  };
  let packet!: MeshMessage;
  await withExclusiveDatabaseTransaction(options.db, async (transaction) => {
    await claimAndSave(transaction, packet, 'sent');
    await pruneMeshRecords(transaction);
  }, { prepare: async () => { packet = await signMeshOrigin(unsigned); } });
  return packet;
}

export async function rememberAndSave(
  db: SQLiteDatabase,
  message: MeshMessage,
  direction: 'sent' | 'received' | 'relayed',
) {
  await withExclusiveDatabaseTransaction(db, async (transaction) => {
    await claimAndSave(transaction, message, direction);
    await pruneMeshRecords(transaction);
  });
}

async function claimAndSave(db: SQLiteDatabase, message: MeshMessage, direction: 'sent' | 'received' | 'relayed') {
  const claimed = await db.runAsync(
    'INSERT OR IGNORE INTO mesh_seen_messages (message_id, seen_at) VALUES (?, ?)',
    message.id,
    // Signed creation time aligns expiry with decideRelay, including future skew.
    // An accepted packet must never become unseen while it is still valid.
    message.createdAt,
  );
  if (claimed.changes !== 1) return false;
  const { medicalSummary: _medicalSummary, ...safeMessage } = message;
  await db.runAsync(
    `INSERT INTO sos_history
      (message_id, direction, emergency_type, severity, payload_json, created_at)
      VALUES (?, ?, ?, ?, ?, ?)`,
    message.id,
    direction,
    message.emergencyType,
    message.severity,
    JSON.stringify(safeMessage),
    Date.now(),
  );
  return true;
}

export async function markMessageRelayed(db: SQLiteDatabase, message: MeshMessage) {
  await withExclusiveDatabaseTransaction(db, async (transaction) => {
    const { medicalSummary: _medicalSummary, ...safeMessage } = message;
    await transaction.runAsync(
      `UPDATE sos_history
       SET direction = 'relayed', payload_json = ?, created_at = ?
       WHERE direction = 'received' AND id = (
         SELECT id FROM sos_history WHERE message_id = ? ORDER BY id DESC LIMIT 1
       )`,
      JSON.stringify(safeMessage),
      Date.now(),
      message.id,
    );
    await pruneMeshRecords(transaction);
  });
}

class InvalidSignature extends Error {}

export async function processIncomingMessage(db: SQLiteDatabase, message: MeshMessage) {
  const { medicalSummary: _medicalSummary, ...safeMessage } = message;
  try {
    return await withExclusiveDatabaseTransaction(db, async (transaction): Promise<RelayDecision> => {
      const now = Date.now();
      const seen = await transaction.getFirstAsync<{ message_id: string }>(
        'SELECT message_id FROM mesh_seen_messages WHERE message_id = ?', safeMessage.id,
      );
      const decision = decideRelay(safeMessage, new Set(seen ? [seen.message_id] : []), now);
      if (!decision.relay) return decision;
      const rate = await transaction.getFirstAsync<{ window_started_at: number; message_count: number }>(
        'SELECT window_started_at, message_count FROM mesh_origin_rate WHERE origin_hash = ?', safeMessage.originHash,
      );
      if (rate && now - rate.window_started_at < MESH_ORIGIN_RATE_WINDOW_MS && rate.message_count >= MESH_ORIGIN_RATE_MAX) {
        return { relay: false, reason: 'rate-limited' };
      }
      if (!(await claimAndSave(transaction, safeMessage, 'received'))) return { relay: false, reason: 'duplicate' };
      if (!rate || now - rate.window_started_at >= MESH_ORIGIN_RATE_WINDOW_MS) {
        await transaction.runAsync(
          'INSERT INTO mesh_origin_rate (origin_hash, window_started_at, message_count) VALUES (?, ?, 1) ON CONFLICT(origin_hash) DO UPDATE SET window_started_at = excluded.window_started_at, message_count = 1',
          safeMessage.originHash, now,
        );
      } else {
        await transaction.runAsync('UPDATE mesh_origin_rate SET message_count = message_count + 1 WHERE origin_hash = ?', safeMessage.originHash);
      }
      // Return relay=true only after claim, quota and received history commit.
      // Transport confirmation remains a separate, idempotent state transition.
      await pruneMeshRecords(transaction, now);
      return decision;
    }, {
      prepare: async () => {
        if (!(await verifyMeshOrigin(safeMessage))) throw new InvalidSignature();
      },
    });
  } catch (error) {
    if (error instanceof InvalidSignature) return { relay: false, reason: 'invalid-signature' } satisfies RelayDecision;
    throw error;
  }
}

export async function purgeSeenMessages(db: SQLiteDatabase) {
  await withExclusiveDatabaseTransaction(db, (transaction) => pruneMeshRecords(transaction));
}

export async function getRecentMeshMessages(db: SQLiteDatabase) {
  const rows = await db.getAllAsync<{ payload_json: string; direction: string; created_at: number }>(
    `SELECT payload_json, direction, created_at FROM sos_history
     WHERE created_at >= ? ORDER BY created_at DESC, id DESC LIMIT 30`,
    Date.now() - MESH_HISTORY_RETENTION_MS,
  );
  return rows.map((row) => ({
    message: JSON.parse(row.payload_json) as MeshMessage,
    direction: row.direction as 'sent' | 'received' | 'relayed',
    createdAt: row.created_at,
  }));
}

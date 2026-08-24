import * as Crypto from 'expo-crypto';
import type { SQLiteDatabase } from 'expo-sqlite';

import { decideRelay, MESH_DEFAULT_TTL, MESH_ORIGIN_RATE_MAX, MESH_ORIGIN_RATE_WINDOW_MS, purgeBeforeTimestamp, type RelayDecision } from '@/lib/mesh';
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
    position: options.position,
    createdAt: Date.now(),
    hopsRemaining: MESH_DEFAULT_TTL,
    initialTtl: MESH_DEFAULT_TTL,
    severity: options.severity,
  };
  const packet = await signMeshOrigin(unsigned);
  await rememberAndSave(options.db, packet, 'sent');
  return packet;
}

export async function rememberAndSave(
  db: SQLiteDatabase,
  message: MeshMessage,
  direction: 'sent' | 'received' | 'relayed',
) {
  await db.withTransactionAsync(async () => {
    await db.runAsync(
      'INSERT OR IGNORE INTO mesh_seen_messages (message_id, seen_at) VALUES (?, ?)',
      message.id,
      Date.now(),
    );
    await db.runAsync(
      `INSERT INTO sos_history
        (message_id, direction, emergency_type, severity, payload_json, created_at)
        VALUES (?, ?, ?, ?, ?, ?)`,
      message.id,
      direction,
      message.emergencyType,
      message.severity,
      JSON.stringify(message),
      Date.now(),
    );
  });
}

export async function markMessageRelayed(db: SQLiteDatabase, message: MeshMessage) {
  await db.runAsync(
    `UPDATE sos_history
     SET direction = 'relayed', payload_json = ?, created_at = ?
     WHERE id = (
       SELECT id FROM sos_history WHERE message_id = ? ORDER BY id DESC LIMIT 1
     )`,
    JSON.stringify(message),
    Date.now(),
    message.id,
  );
}

export async function processIncomingMessage(db: SQLiteDatabase, message: MeshMessage) {
  const { medicalSummary: _medicalSummary, ...safeMessage } = message;
  if (!(await verifyMeshOrigin(safeMessage))) {
    return { relay: false, reason: 'invalid-signature' } satisfies RelayDecision;
  }
  const seen = await db.getFirstAsync<{ message_id: string }>(
    'SELECT message_id FROM mesh_seen_messages WHERE message_id = ?',
    safeMessage.id,
  );
  const decision = decideRelay(safeMessage, new Set(seen ? [seen.message_id] : []));
  if (!decision.relay) return decision;
  const now = Date.now();
  const rate = await db.getFirstAsync<{ window_started_at: number; message_count: number }>(
    'SELECT window_started_at, message_count FROM mesh_origin_rate WHERE origin_hash = ?',
    safeMessage.originHash,
  );
  if (rate && now - rate.window_started_at < MESH_ORIGIN_RATE_WINDOW_MS && rate.message_count >= MESH_ORIGIN_RATE_MAX) {
    return { relay: false, reason: 'rate-limited' } satisfies RelayDecision;
  }
  if (!rate || now - rate.window_started_at >= MESH_ORIGIN_RATE_WINDOW_MS) {
    await db.runAsync(
      'INSERT INTO mesh_origin_rate (origin_hash, window_started_at, message_count) VALUES (?, ?, 1) ON CONFLICT(origin_hash) DO UPDATE SET window_started_at = excluded.window_started_at, message_count = 1',
      safeMessage.originHash,
      now,
    );
  } else {
    await db.runAsync('UPDATE mesh_origin_rate SET message_count = message_count + 1 WHERE origin_hash = ?', safeMessage.originHash);
  }
  // Receiving and actually retransmitting are distinct states. The caller only
  // marks this row as relayed after Android confirms that BLE advertising began.
  await rememberAndSave(db, safeMessage, 'received');
  return decision;
}

export async function purgeSeenMessages(db: SQLiteDatabase) {
  await db.runAsync('DELETE FROM mesh_seen_messages WHERE seen_at < ?', purgeBeforeTimestamp());
  await db.runAsync('DELETE FROM mesh_origin_rate WHERE window_started_at < ?', Date.now() - MESH_ORIGIN_RATE_WINDOW_MS);
}

export async function getRecentMeshMessages(db: SQLiteDatabase) {
  const rows = await db.getAllAsync<{ payload_json: string; direction: string; created_at: number }>(
    `SELECT payload_json, direction, created_at FROM sos_history
     ORDER BY created_at DESC LIMIT 30`,
  );
  return rows.map((row) => ({
    message: JSON.parse(row.payload_json) as MeshMessage,
    direction: row.direction as 'sent' | 'received' | 'relayed',
    createdAt: row.created_at,
  }));
}

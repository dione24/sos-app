import type { SQLiteDatabase } from 'expo-sqlite';

// Deliberately independent of the Zod/wire module on the startup import path.
export const MESH_SEEN_RETENTION_MS = 30 * 60 * 1000;
export const MESH_RATE_RETENTION_MS = 10 * 60 * 1000;
export const MESH_LEGACY_SEEN_SKEW_GRACE_MS = 5 * 60 * 1000;
export const MESH_HISTORY_RETENTION_MS = 30 * 24 * 60 * 60 * 1000;
export const MESH_HISTORY_MAX_ROWS = 1000;

/** Caller owns the write transaction. Never touches a profile or contact. */
export async function pruneMeshRecords(transaction: SQLiteDatabase, now = Date.now()) {
  await transaction.runAsync('DELETE FROM mesh_seen_messages WHERE seen_at < ?', now - MESH_SEEN_RETENTION_MS);
  await transaction.runAsync('DELETE FROM mesh_origin_rate WHERE window_started_at < ?', now - MESH_RATE_RETENTION_MS);
  await transaction.runAsync('DELETE FROM sos_history WHERE created_at < ?', now - MESH_HISTORY_RETENTION_MS);
  await transaction.runAsync(
    `DELETE FROM sos_history WHERE id IN (
      SELECT id FROM sos_history ORDER BY created_at DESC, id DESC LIMIT -1 OFFSET ?
    )`,
    MESH_HISTORY_MAX_ROWS,
  );
}

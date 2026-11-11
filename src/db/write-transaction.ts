import type { SQLiteDatabase } from 'expo-sqlite';

// Reuse the already-authorised key only in memory; never copy it into options,
// settings, an auxiliary file or a log. Weak keys follow the provider lifetime.
const encryptionKeys = new WeakMap<SQLiteDatabase, string>();
const nativeQueues = new Map<string, Promise<void>>();
const shimQueues = new WeakMap<SQLiteDatabase, Promise<void>>();
export const DATABASE_WRITER_IDLE_MS = 15_000;
type Writer = { connection: SQLiteDatabase; owner: SQLiteDatabase; timer: ReturnType<typeof setTimeout> | null };
const writers = new Map<string, Writer>();

export function registerDatabaseEncryptionKey(db: SQLiteDatabase, key: string) {
  if (!/^[a-f0-9]{64}$/.test(key)) throw new Error('Clé de chiffrement locale invalide');
  encryptionKeys.set(db, key);
}

type WriteOptions = {
  /** Enqueued before crypto so a privacy wipe cannot overtake an accepted job. */
  prepare?: () => Promise<void>;
  afterCommit?: (connection: SQLiteDatabase) => Promise<void>;
};

function enqueue<T>(db: SQLiteDatabase, operation: (path: string | null) => Promise<T>): Promise<T> {
  const path = typeof db.databasePath === 'string' ? db.databasePath : null;
  const writer = path ? writers.get(path) : undefined;
  if (writer?.timer) { clearTimeout(writer.timer); writer.timer = null; }
  const previous = path ? nativeQueues.get(path) : shimQueues.get(db);
  const result = (previous ?? Promise.resolve()).catch(() => undefined).then(() => {
    const active = path ? writers.get(path) : undefined;
    if (active?.timer) { clearTimeout(active.timer); active.timer = null; }
    return operation(path);
  });
  const settled = result.then(() => undefined, () => undefined);
  if (path) nativeQueues.set(path, settled);
  else shimQueues.set(db, settled);
  void settled.then(() => {
    if (path) {
      if (nativeQueues.get(path) === settled) nativeQueues.delete(path);
    } else if (shimQueues.get(db) === settled) shimQueues.delete(db);
  });
  return result;
}

/** Await on provider teardown; also safe to call to release an idle writer. */
export function closeDatabaseWriter(db: SQLiteDatabase): Promise<void> {
  return enqueue(db, async (path) => {
    if (!path) return;
    const writer = writers.get(path);
    if (!writer) return;
    if (writer.timer) clearTimeout(writer.timer);
    writers.delete(path);
    await writer.connection.closeAsync();
  });
}

function closeWhenIdle(path: string, writer: Writer) {
  if (writer.timer) clearTimeout(writer.timer);
  writer.timer = setTimeout(() => {
    if (writers.get(path) === writer) void closeDatabaseWriter(writer.owner).catch(() => undefined);
  }, DATABASE_WRITER_IDLE_MS);
  // Do not keep a Node test process alive. React Native timers are numbers.
  (writer.timer as unknown as { unref?: () => void }).unref?.();
}

async function getWriter(db: SQLiteDatabase, path: string): Promise<Writer> {
  const key = encryptionKeys.get(db);
  if (!key) throw new Error('Base chiffrée non initialisée');
  const existing = writers.get(path);
  if (existing && encryptionKeys.get(existing.owner) === key) return existing;
  if (existing) {
    writers.delete(path);
    if (existing.timer) clearTimeout(existing.timer);
    await existing.connection.closeAsync();
  }
  const separator = path.lastIndexOf('/');
  // Keep pure bootstrap helpers/web shims free of native module evaluation.
  const { openDatabaseAsync } = await import('expo-sqlite');
  const connection = await openDatabaseAsync(
    separator < 0 ? path : path.slice(separator + 1),
    { ...db.options, useNewConnection: true },
    separator < 0 ? undefined : path.slice(0, separator) || '/',
  );
  try {
    // Key the dedicated connection before its first query, unlike the SDK's
    // withExclusiveTransactionAsync which begins an unkeyed new connection.
    await connection.execAsync(`PRAGMA key = "x'${key}'";`);
    const cipher = await connection.getFirstAsync<{ cipher_version: string }>('PRAGMA cipher_version');
    if (!cipher?.cipher_version) throw new Error('SQLCipher indisponible');
    await connection.execAsync('PRAGMA foreign_keys = ON; PRAGMA busy_timeout = 5000;');
    const writer: Writer = { connection, owner: db, timer: null };
    writers.set(path, writer);
    return writer;
  } catch (error) {
    await connection.closeAsync();
    throw error;
  }
}

/** One dedicated keyed writer per database, reused across a burst of operations. */
export function withExclusiveDatabaseTransaction<T>(
  db: SQLiteDatabase,
  task: (transaction: SQLiteDatabase) => Promise<T>,
  options: WriteOptions = {},
): Promise<T> {
  return enqueue(db, async (path) => {
    try {
      await options.prepare?.();

      // The visual web shim has no native databasePath or SQLCipher connection.
      // Keep it serial too; this branch does not claim native isolation/encryption.
      if (!path) {
        let value!: T;
        await db.withTransactionAsync(async () => { value = await task(db); });
        await options.afterCommit?.(db);
        return value;
      }

      const writer = await getWriter(db, path);
      const connection = writer.connection;
      let begun = false;
      try {
        // Reserve the writer before checking seen/quota; WAL readers remain usable.
        await connection.execAsync('BEGIN IMMEDIATE');
        begun = true;
        const value = await task(connection);
        await connection.execAsync('COMMIT');
        begun = false;
        // Privacy checkpoint/VACUUM stays inside the same per-database queue.
        await options.afterCommit?.(connection);
        return value;
      } catch (error) {
        if (begun) {
          try { await connection.execAsync('ROLLBACK'); } catch {
            // Never reuse a connection whose transaction state is now unknown.
            writers.delete(path);
            try { await connection.closeAsync(); } catch { /* Preserve the original failure. */ }
          }
        }
        throw error;
      }
    } finally {
      // enqueue cancels the idle timer before prepare. Re-arm even if signature
      // verification or connection setup rejects before entering a transaction.
      const writer = path ? writers.get(path) : undefined;
      if (path && writer) closeWhenIdle(path, writer);
    }
  });
}

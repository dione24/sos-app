/// <reference types="node" />

import { createRequire } from 'node:module';
import type { DatabaseSync, SQLInputValue } from 'node:sqlite';
import type { SQLiteDatabase, SQLiteOpenOptions } from 'expo-sqlite';

let nextId = 0;
const fixtures = new Map<string, SqliteFixture>();
let SqliteDatabase: (typeof import('node:sqlite'))['DatabaseSync'] | undefined;
try { SqliteDatabase = createRequire(import.meta.url)('node:sqlite').DatabaseSync; } catch { /* Optional on older Node runtimes. */ }
export const HAS_NODE_SQLITE = Boolean(SqliteDatabase);

/** Real SQLite engine in memory; Expo connection/SQLCipher calls are adapters. */
export class SqliteFixture {
  readonly engine: DatabaseSync;
  readonly path = `/synthetic-memory/db-${++nextId}.db`;
  readonly statements: string[] = [];
  readonly opens: Array<{ name: string; options: SQLiteOpenOptions; directory: string | undefined }> = [];
  failOnce: string | null = null;
  cipherAvailable = true;
  closedConnections = 0;
  readonly db: SQLiteDatabase;

  constructor() {
    if (!SqliteDatabase) throw new Error('SQLite engine tests require a Node runtime with node:sqlite');
    this.engine = new SqliteDatabase(':memory:');
    fixtures.set(this.path, this);
    this.db = this.connection();
  }

  connection(): SQLiteDatabase {
    const fixture = this;
    function check(sql: string) {
      fixture.statements.push(sql.startsWith('PRAGMA key') ? 'PRAGMA key [redacted]' : sql);
      if (fixture.failOnce && sql.includes(fixture.failOnce)) {
        fixture.failOnce = null;
        throw new Error('Synthetic SQLite failure');
      }
    }
    return {
      databasePath: fixture.path,
      options: {},
      execAsync: async (sql: string) => { check(sql); fixture.engine.exec(sql); },
      runAsync: async (sql: string, ...args: SQLInputValue[]) => {
        check(sql);
        const result = fixture.engine.prepare(sql).run(...args);
        return { changes: Number(result.changes), lastInsertRowId: Number(result.lastInsertRowid) };
      },
      getFirstAsync: async <T>(sql: string, ...args: SQLInputValue[]) => {
        check(sql);
        if (sql === 'PRAGMA cipher_version') return fixture.cipherAvailable ? { cipher_version: 'adapter-not-SQLCipher' } as T : null;
        return (fixture.engine.prepare(sql).get(...args) ?? null) as T | null;
      },
      getAllAsync: async <T>(sql: string, ...args: SQLInputValue[]) => {
        check(sql);
        return fixture.engine.prepare(sql).all(...args) as T[];
      },
      closeAsync: async () => { fixture.closedConnections += 1; },
    } as unknown as SQLiteDatabase;
  }

  dispose() {
    fixtures.delete(this.path);
    this.engine.close();
  }
}

export async function openTestConnection(name: string, options: SQLiteOpenOptions, directory?: string) {
  const fixture = fixtures.get(`${directory}/${name}`);
  if (!fixture) throw new Error('Unknown synthetic database');
  fixture.opens.push({ name, options, directory });
  return fixture.connection();
}

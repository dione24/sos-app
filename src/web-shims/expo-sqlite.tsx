/**
 * Shim web d'`expo-sqlite` : base en mémoire (persistée dans localStorage) qui
 * reconnaît uniquement les requêtes de l'application. Chargé par metro.config.js
 * pour la plateforme web seulement ; Android/iOS utilisent SQLCipher.
 */
import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';

type Row = Record<string, unknown>;
type Tables = Record<string, Row[]>;
type Param = string | number | null | boolean | undefined;

const STORAGE_KEY = 'sos-mali-web-shim-db';
const TABLES = ['user_profile', 'emergency_contacts', 'app_settings', 'rescuer_opt_in', 'mesh_seen_messages', 'mesh_origin_rate', 'sos_history'];

function emptyTables(): Tables {
  return Object.fromEntries(TABLES.map((name) => [name, []]));
}

function load(): Tables {
  try {
    const raw = globalThis.localStorage?.getItem(STORAGE_KEY);
    return raw ? { ...emptyTables(), ...(JSON.parse(raw) as Tables) } : emptyTables();
  } catch {
    return emptyTables();
  }
}

function persist(tables: Tables) {
  try {
    globalThis.localStorage?.setItem(STORAGE_KEY, JSON.stringify(tables));
  } catch {
    // Stockage indisponible : la base reste en mémoire.
  }
}

export class SQLiteDatabase {
  private tables = load();
  private nextId = 1;

  async execAsync(sql: string) {
    if (/DELETE FROM user_profile;[\s\S]*DELETE FROM sos_history/.test(sql)) {
      this.tables = emptyTables();
      persist(this.tables);
    }
  }

  async getFirstAsync<T>(sql: string, ...params: Param[]): Promise<T | null> {
    const rows = await this.getAllAsync<T>(sql, ...params);
    return rows[0] ?? null;
  }

  async getAllAsync<T>(sql: string, ...params: Param[]): Promise<T[]> {
    const query = sql.replace(/\s+/g, ' ').trim();
    if (/^PRAGMA cipher_version/i.test(query)) return [{ cipher_version: 'web-shim' } as T];
    if (/^PRAGMA user_version/i.test(query)) return [{ user_version: 2 } as T];
    if (/FROM user_profile/i.test(query)) {
      return [...this.tables.user_profile!].sort((a, b) => Number(b.updated_at) - Number(a.updated_at)) as T[];
    }
    if (/FROM emergency_contacts/i.test(query)) {
      return this.tables.emergency_contacts!.filter((row) => row.profile_phone === params[0]) as T[];
    }
    if (/FROM app_settings/i.test(query)) {
      return this.tables.app_settings!.filter((row) => row.key === params[0]) as T[];
    }
    if (/FROM rescuer_opt_in/i.test(query)) return this.tables.rescuer_opt_in! as T[];
    if (/FROM sos_history/i.test(query)) {
      return [...this.tables.sos_history!].sort((a, b) => Number(b.created_at) - Number(a.created_at)).slice(0, 30) as T[];
    }
    if (/FROM mesh_seen_messages/i.test(query)) {
      return this.tables.mesh_seen_messages!.filter((row) => row.message_id === params[0]) as T[];
    }
    if (/FROM mesh_origin_rate/i.test(query)) {
      return this.tables.mesh_origin_rate!.filter((row) => row.origin_hash === params[0]) as T[];
    }
    return [];
  }

  async runAsync(sql: string, ...params: Param[]) {
    const query = sql.replace(/\s+/g, ' ').trim();
    const t = this.tables;
    if (/^INSERT INTO user_profile/i.test(query)) {
      const [phone, name, blood_type, allergies, treatments, medical_history, photo_uri, include_in_sos, updated_at] = params;
      t.user_profile = t.user_profile!.filter((row) => row.phone !== phone);
      t.user_profile.push({ phone, name, blood_type, allergies, treatments, medical_history, photo_uri, include_in_sos, updated_at });
    } else if (/^DELETE FROM user_profile/i.test(query)) {
      t.user_profile = [];
    } else if (/^DELETE FROM emergency_contacts WHERE/i.test(query)) {
      t.emergency_contacts = t.emergency_contacts!.filter((row) => row.profile_phone !== params[0]);
    } else if (/^DELETE FROM emergency_contacts/i.test(query)) {
      t.emergency_contacts = [];
    } else if (/^INSERT INTO emergency_contacts/i.test(query)) {
      const [profile_phone, name, phone] = params;
      t.emergency_contacts!.push({ id: this.nextId++, profile_phone, name, phone });
    } else if (/^INSERT INTO app_settings/i.test(query)) {
      const [key, value] = params;
      t.app_settings = t.app_settings!.filter((row) => row.key !== key);
      t.app_settings.push({ key, value });
    } else if (/^INSERT INTO rescuer_opt_in/i.test(query)) {
      t.rescuer_opt_in = [{ id: 1, enabled: params[0], alias: params[1] ?? '' }];
    } else if (/^INSERT INTO sos_history/i.test(query)) {
      const [message_id, direction, emergency_type, severity, payload_json, created_at] = params;
      t.sos_history!.push({ id: this.nextId++, message_id, direction, emergency_type, severity, payload_json, created_at });
    } else if (/^INSERT OR IGNORE INTO mesh_seen_messages/i.test(query)) {
      if (!t.mesh_seen_messages!.some((row) => row.message_id === params[0])) {
        t.mesh_seen_messages!.push({ message_id: params[0], seen_at: params[1] });
      }
    }
    persist(t);
    return { changes: 1, lastInsertRowId: this.nextId - 1 };
  }

  async withTransactionAsync(task: () => Promise<void>) {
    await task();
  }
}

const Context = createContext<SQLiteDatabase | null>(null);

export function SQLiteProvider({
  children,
  onInit,
}: {
  databaseName?: string;
  children: ReactNode;
  onInit?: (db: SQLiteDatabase) => Promise<void> | void;
}) {
  const [db, setDb] = useState<SQLiteDatabase | null>(null);
  useEffect(() => {
    const instance = new SQLiteDatabase();
    void Promise.resolve(onInit?.(instance)).then(() => setDb(instance));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  if (!db) return null;
  return <Context.Provider value={db}>{children}</Context.Provider>;
}

export function useSQLiteContext(): SQLiteDatabase {
  const db = useContext(Context);
  if (!db) throw new Error('useSQLiteContext hors du SQLiteProvider (shim web)');
  return db;
}

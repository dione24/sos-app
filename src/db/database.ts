import type { SQLiteDatabase } from 'expo-sqlite';

import type { EmergencyContact, MedicalProfile } from '@/types/models';

export async function migrateDatabase(db: SQLiteDatabase, encryptionKey: string) {
  if (!/^[a-f0-9]{64}$/.test(encryptionKey)) throw new Error('Clé de chiffrement locale invalide');
  await db.execAsync(`PRAGMA key = \"x'${encryptionKey}'\";`);
  const cipher = await db.getFirstAsync<{ cipher_version: string }>('PRAGMA cipher_version');
  if (!cipher?.cipher_version) throw new Error('SQLCipher indisponible : ouverture sécurisée impossible');
  // SQLite resets this setting for every connection. Re-enable it on every
  // launch so profile/contact cascades cannot silently stop working.
  await db.execAsync('PRAGMA foreign_keys = ON;');
  const result = await db.getFirstAsync<{ user_version: number }>('PRAGMA user_version');
  const currentVersion = result?.user_version ?? 0;

  if (currentVersion < 1) {
    await db.execAsync(`
      PRAGMA journal_mode = WAL;
      PRAGMA foreign_keys = ON;

      CREATE TABLE IF NOT EXISTS user_profile (
        phone TEXT PRIMARY KEY NOT NULL,
        name TEXT NOT NULL DEFAULT '',
        blood_type TEXT NOT NULL DEFAULT '',
        allergies TEXT NOT NULL DEFAULT '',
        treatments TEXT NOT NULL DEFAULT '',
        medical_history TEXT NOT NULL DEFAULT '',
        photo_uri TEXT,
        include_in_sos INTEGER NOT NULL DEFAULT 0,
        updated_at INTEGER NOT NULL
      );

      CREATE TABLE IF NOT EXISTS emergency_contacts (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        profile_phone TEXT NOT NULL,
        name TEXT NOT NULL,
        phone TEXT NOT NULL,
        FOREIGN KEY(profile_phone) REFERENCES user_profile(phone) ON DELETE CASCADE
      );

      CREATE TABLE IF NOT EXISTS app_settings (
        key TEXT PRIMARY KEY NOT NULL,
        value TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS rescuer_opt_in (
        id INTEGER PRIMARY KEY CHECK (id = 1),
        enabled INTEGER NOT NULL DEFAULT 0,
        alias TEXT NOT NULL DEFAULT ''
      );

      CREATE TABLE IF NOT EXISTS mesh_seen_messages (
        message_id TEXT PRIMARY KEY NOT NULL,
        seen_at INTEGER NOT NULL
      );

      CREATE TABLE IF NOT EXISTS sos_history (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        message_id TEXT NOT NULL,
        direction TEXT NOT NULL CHECK(direction IN ('sent', 'received', 'relayed')),
        emergency_type TEXT NOT NULL,
        severity TEXT NOT NULL,
        payload_json TEXT NOT NULL,
        created_at INTEGER NOT NULL
      );
    `);
    await db.execAsync('PRAGMA user_version = 1');
  }

  if (currentVersion < 2) {
    await db.execAsync(`
      CREATE TABLE IF NOT EXISTS mesh_origin_rate (
        origin_hash TEXT PRIMARY KEY NOT NULL,
        window_started_at INTEGER NOT NULL,
        message_count INTEGER NOT NULL DEFAULT 0
      );
    `);
    await db.execAsync('PRAGMA user_version = 2');
  }
}

export async function clearAllUserData(db: SQLiteDatabase) {
  // Overwrite deleted cells instead of only unlinking them from SQLite pages.
  // The database stays open for the onboarding redirect, so we securely compact
  // it rather than deleting the file/key underneath SQLiteProvider.
  await db.execAsync('PRAGMA secure_delete = ON;');
  await db.withTransactionAsync(async () => {
    await db.execAsync(`
      DELETE FROM emergency_contacts;
      DELETE FROM user_profile;
      DELETE FROM app_settings;
      DELETE FROM rescuer_opt_in;
      DELETE FROM mesh_seen_messages;
      DELETE FROM mesh_origin_rate;
      DELETE FROM sos_history;
    `);
  });
  await db.execAsync('PRAGMA wal_checkpoint(TRUNCATE);');
  await db.execAsync('VACUUM;');
}

export async function getProfile(db: SQLiteDatabase): Promise<MedicalProfile | null> {
  const row = await db.getFirstAsync<{
    phone: string;
    name: string;
    blood_type: string;
    allergies: string;
    treatments: string;
    medical_history: string;
    photo_uri: string | null;
    include_in_sos: number;
    updated_at: number;
  }>('SELECT * FROM user_profile ORDER BY updated_at DESC LIMIT 1');

  if (!row) return null;
  return {
    phone: row.phone,
    name: row.name,
    bloodType: row.blood_type,
    allergies: row.allergies,
    treatments: row.treatments,
    history: row.medical_history,
    photoUri: row.photo_uri,
    includeInSos: row.include_in_sos === 1,
    updatedAt: row.updated_at,
  };
}

export async function saveProfile(db: SQLiteDatabase, profile: MedicalProfile) {
  await db.runAsync(
    `INSERT INTO user_profile
      (phone, name, blood_type, allergies, treatments, medical_history, photo_uri, include_in_sos, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(phone) DO UPDATE SET
        name = excluded.name,
        blood_type = excluded.blood_type,
        allergies = excluded.allergies,
        treatments = excluded.treatments,
        medical_history = excluded.medical_history,
        photo_uri = excluded.photo_uri,
        include_in_sos = excluded.include_in_sos,
        updated_at = excluded.updated_at`,
    profile.phone,
    profile.name,
    profile.bloodType,
    profile.allergies,
    profile.treatments,
    profile.history,
    profile.photoUri,
    profile.includeInSos ? 1 : 0,
    profile.updatedAt,
  );
}

export async function getContacts(db: SQLiteDatabase, profilePhone: string) {
  const rows = await db.getAllAsync<{ id: number; name: string; phone: string }>(
    'SELECT id, name, phone FROM emergency_contacts WHERE profile_phone = ? ORDER BY id',
    profilePhone,
  );
  return rows satisfies EmergencyContact[];
}

export async function replaceContacts(
  db: SQLiteDatabase,
  profilePhone: string,
  contacts: EmergencyContact[],
) {
  await db.withTransactionAsync(async () => {
    await db.runAsync('DELETE FROM emergency_contacts WHERE profile_phone = ?', profilePhone);
    for (const contact of contacts) {
      if (contact.name.trim() && contact.phone.trim()) {
        await db.runAsync(
          'INSERT INTO emergency_contacts (profile_phone, name, phone) VALUES (?, ?, ?)',
          profilePhone,
          contact.name.trim(),
          contact.phone.trim(),
        );
      }
    }
  });
}

/** Replaces the only local medical dossier as one atomic import operation. */
export async function replaceProfileFromImport(
  db: SQLiteDatabase,
  profile: MedicalProfile,
  contacts: EmergencyContact[],
) {
  await db.withTransactionAsync(async () => {
    // Delete contacts explicitly in addition to the cascade. This cleans up
    // records created by older connections where foreign_keys was disabled.
    await db.runAsync('DELETE FROM emergency_contacts');
    await db.runAsync('DELETE FROM user_profile');
    await saveProfile(db, profile);
    for (const contact of contacts.slice(0, 2)) {
      if (contact.name.trim() && contact.phone.trim()) {
        await db.runAsync(
          'INSERT INTO emergency_contacts (profile_phone, name, phone) VALUES (?, ?, ?)',
          profile.phone,
          contact.name.trim(),
          contact.phone.trim(),
        );
      }
    }
  });
}

export async function getSetting(db: SQLiteDatabase, key: string) {
  const result = await db.getFirstAsync<{ value: string }>(
    'SELECT value FROM app_settings WHERE key = ?',
    key,
  );
  return result?.value ?? null;
}

export async function setSetting(db: SQLiteDatabase, key: string, value: string) {
  await db.runAsync(
    'INSERT INTO app_settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value',
    key,
    value,
  );
}

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('expo-sqlite', async () => ({ openDatabaseAsync: (await import('./sqlite-test-driver')).openTestConnection }));
vi.mock('expo-crypto', () => ({ randomUUID: vi.fn(() => 'generated-id') }));
vi.mock('@/services/mesh-integrity', () => ({ signMeshOrigin: vi.fn(), verifyMeshOrigin: vi.fn(async () => true) }));

import { clearAllUserData, migrateDatabase, replaceContacts, replaceProfileFromImport, saveProfile, saveProfileWithContacts, setSetting } from '../database';
import { HAS_NODE_SQLITE, SqliteFixture } from './sqlite-test-driver';
import { closeDatabaseWriter, DATABASE_WRITER_IDLE_MS } from '../write-transaction';
import { MESH_HISTORY_MAX_ROWS, MESH_HISTORY_RETENTION_MS, MESH_RATE_RETENTION_MS, MESH_SEEN_RETENTION_MS } from '../mesh-retention';
import { MESH_MESSAGE_MAX_AGE_MS, MESH_ORIGIN_RATE_MAX, MESH_ORIGIN_RATE_WINDOW_MS } from '@/lib/mesh';
import { signMeshOrigin, verifyMeshOrigin } from '@/services/mesh-integrity';
import { createMeshMessage, getRecentMeshMessages, markMessageRelayed, processIncomingMessage, purgeSeenMessages, rememberAndSave } from '@/services/mesh-repository';
import type { MeshMessage } from '@/types/models';

const NOW = 1_800_000_000_000;
const profile = { phone: '+22370000000', name: 'Synthetic', bloodType: 'O+', allergies: '', treatments: '', history: '', photoUri: null, includeInSos: true, updatedAt: NOW };
const contacts = [{ name: 'Synthetic contact', phone: '+22371111111' }, { name: 'Second contact', phone: '+22372222222' }];
const packet = (id = 'packet-1', originHash = 'origin-1'): MeshMessage => ({
  id, emergencyType: 'medical', position: null, createdAt: Date.now(), hopsRemaining: 2,
  initialTtl: 3, severity: 'critique', originHash, originPublicKey: 'public-key', originSignature: 'signature',
});

describe.skipIf(!HAS_NODE_SQLITE)('real SQLite in memory with an Expo connection adapter (not SQLCipher)', () => {
  let fixture: SqliteFixture;
  const count = (table: string) => Number(fixture.engine.prepare(`SELECT count(*) AS n FROM ${table}`).get()!.n);
  beforeEach(async () => {
    vi.useFakeTimers({ toFake: ['Date'] }); vi.setSystemTime(NOW);
    vi.mocked(verifyMeshOrigin).mockReset().mockResolvedValue(true);
    fixture = new SqliteFixture();
    await migrateDatabase(fixture.db, 'a'.repeat(64));
  });
  afterEach(async () => { await closeDatabaseWriter(fixture.db); fixture.dispose(); vi.useRealTimers(); });

  it('keys a dedicated writer before BEGIN and closes it explicitly on teardown', async () => {
    const begin = fixture.statements.indexOf('BEGIN IMMEDIATE');
    expect(fixture.statements.slice(begin - 3, begin)).toEqual(['PRAGMA key [redacted]', 'PRAGMA cipher_version', 'PRAGMA foreign_keys = ON; PRAGMA busy_timeout = 5000;']);
    expect(fixture.opens[0]?.options.useNewConnection).toBe(true);
    expect(fixture.closedConnections).toBe(0);
    expect(fixture.engine.prepare('PRAGMA user_version').get()!.user_version).toBe(3);
    await closeDatabaseWriter(fixture.db);
    expect(fixture.closedConnections).toBe(fixture.opens.length);
  });

  it('reuses one keyed writer for a burst, then can reopen after cleanup', async () => {
    await Promise.all(Array.from({ length: 8 }, (_, i) => setSetting(fixture.db, `synthetic-${i}`, 'value')));
    expect(fixture.opens).toHaveLength(1);
    expect(fixture.statements.filter((sql) => sql === 'PRAGMA key [redacted]')).toHaveLength(2); // original + dedicated
    await closeDatabaseWriter(fixture.db);
    await setSetting(fixture.db, 'after-close', 'value');
    expect(fixture.opens).toHaveLength(2);
  });

  it('releases the cached connection after its idle window', async () => {
    await closeDatabaseWriter(fixture.db);
    vi.useFakeTimers({ toFake: ['Date', 'setTimeout', 'clearTimeout'] });
    const closed = fixture.closedConnections;
    await setSetting(fixture.db, 'synthetic', 'value');
    await vi.advanceTimersByTimeAsync(DATABASE_WRITER_IDLE_MS);
    expect(fixture.closedConnections).toBe(closed + 1);
    await setSetting(fixture.db, 'reopened', 'value');
    expect(fixture.opens).toHaveLength(3);
  });

  it('rearms idle cleanup after rejected prepare and retains the key only for reopening', async () => {
    await closeDatabaseWriter(fixture.db);
    vi.useFakeTimers({ toFake: ['Date', 'setTimeout', 'clearTimeout'] });
    await setSetting(fixture.db, 'before-invalid-signature', 'value');
    const opened = fixture.opens.length;
    const closed = fixture.closedConnections;
    const keyed = fixture.statements.filter((sql) => sql === 'PRAGMA key [redacted]').length;
    vi.mocked(verifyMeshOrigin).mockResolvedValue(false);
    expect(await processIncomingMessage(fixture.db, packet())).toEqual({ relay: false, reason: 'invalid-signature' });
    expect(fixture.opens).toHaveLength(opened);
    await vi.advanceTimersByTimeAsync(DATABASE_WRITER_IDLE_MS);
    expect(fixture.closedConnections).toBe(closed + 1);
    await setSetting(fixture.db, 'after-idle-close', 'value');
    expect(fixture.opens).toHaveLength(opened + 1);
    expect(fixture.statements.filter((sql) => sql === 'PRAGMA key [redacted]')).toHaveLength(keyed + 1);
  });

  it('grants exactly one relay and quota slot for twenty parallel copies', async () => {
    const results = await Promise.all(Array.from({ length: 20 }, () => processIncomingMessage(fixture.db, { ...packet(), medicalSummary: 'Never persist' })));
    expect(results.filter((r) => r.relay)).toHaveLength(1);
    expect(results.filter((r) => !r.relay && r.reason === 'duplicate')).toHaveLength(19);
    expect(count('mesh_seen_messages')).toBe(1); expect(count('sos_history')).toBe(1);
    const history = fixture.engine.prepare('SELECT direction,payload_json FROM sos_history').get()!;
    expect(history.direction).toBe('received');
    expect(String(history.payload_json)).not.toContain('medicalSummary');
    expect(fixture.engine.prepare('SELECT message_count FROM mesh_origin_rate').get()!.message_count).toBe(1);
  });

  it('normalizes local location timestamps before signing a newly created message', async () => {
    vi.mocked(signMeshOrigin).mockImplementationOnce(async (message) => ({
      ...message, originHash: 'a'.repeat(16), originPublicKey: 'b'.repeat(120), originSignature: 'c'.repeat(96),
    }));
    const result = await createMeshMessage({ db: fixture.db, emergencyType: 'medical', severity: 'critique',
      position: { latitude: 12.6, longitude: -8, accuracy: 25, timestamp: NOW },
    });
    expect(vi.mocked(signMeshOrigin).mock.calls.at(-1)?.[0].position).toEqual({ latitude: 12.6, longitude: -8, accuracy: 25 });
    expect(result.position).not.toHaveProperty('timestamp');
  });

  it('atomically limits parallel distinct messages from one origin', async () => {
    const results = await Promise.all(Array.from({ length: 15 }, (_, i) => processIncomingMessage(fixture.db, packet(`packet-${i}`))));
    expect(results.filter((r) => r.relay)).toHaveLength(MESH_ORIGIN_RATE_MAX);
    expect(results.filter((r) => !r.relay && r.reason === 'rate-limited')).toHaveLength(15 - MESH_ORIGIN_RATE_MAX);
    expect(count('mesh_seen_messages')).toBe(MESH_ORIGIN_RATE_MAX);
    expect(count('sos_history')).toBe(MESH_ORIGIN_RATE_MAX);
    expect(fixture.engine.prepare('SELECT message_count FROM mesh_origin_rate').get()!.message_count).toBe(MESH_ORIGIN_RATE_MAX);
  });

  it('resets an expired quota window without affecting another origin', async () => {
    for (let i = 0; i < MESH_ORIGIN_RATE_MAX; i++) await processIncomingMessage(fixture.db, packet(`first-${i}`));
    vi.setSystemTime(NOW + MESH_ORIGIN_RATE_WINDOW_MS);
    expect((await processIncomingMessage(fixture.db, packet('next'))).relay).toBe(true);
    expect((await processIncomingMessage(fixture.db, packet('other', 'origin-2'))).relay).toBe(true);
    expect(fixture.engine.prepare("SELECT message_count FROM mesh_origin_rate WHERE origin_hash='origin-1'").get()!.message_count).toBe(1);
  });

  it('rolls claim, history and quota back together, then releases the queue', async () => {
    fixture.failOnce = 'INSERT INTO mesh_origin_rate';
    await expect(processIncomingMessage(fixture.db, packet())).rejects.toThrow('Synthetic SQLite failure');
    for (const table of ['mesh_seen_messages', 'sos_history', 'mesh_origin_rate']) expect(count(table)).toBe(0);
    expect((await processIncomingMessage(fixture.db, packet())).relay).toBe(true);
  });

  it('marks transport confirmation once without converting sent rows', async () => {
    const decision = await processIncomingMessage(fixture.db, packet());
    if (!decision.relay) throw new Error('Expected relay');
    vi.setSystemTime(NOW + 1000);
    await markMessageRelayed(fixture.db, decision.packet);
    const first = fixture.engine.prepare('SELECT direction,created_at,payload_json FROM sos_history').get()!;
    expect(first.direction).toBe('relayed');
    expect(JSON.parse(String(first.payload_json)).hopsRemaining).toBe(1);
    vi.setSystemTime(NOW + 2000);
    await markMessageRelayed(fixture.db, decision.packet);
    expect(fixture.engine.prepare('SELECT created_at FROM sos_history').get()!.created_at).toBe(first.created_at);
    await rememberAndSave(fixture.db, packet('own'), 'sent');
    await markMessageRelayed(fixture.db, packet('own'));
    expect(fixture.engine.prepare("SELECT direction FROM sos_history WHERE message_id='own'").get()!.direction).toBe('sent');
  });

  it('does not reopen replay acceptance while a future-skewed packet remains valid', async () => {
    const future = { ...packet(), createdAt: NOW + 5 * 60 * 1000 };
    expect((await processIncomingMessage(fixture.db, future)).relay).toBe(true);
    vi.setSystemTime(NOW + 31 * 60 * 1000); await purgeSeenMessages(fixture.db);
    expect(await processIncomingMessage(fixture.db, future)).toEqual({ relay: false, reason: 'duplicate' });
    vi.setSystemTime(future.createdAt + MESH_MESSAGE_MAX_AGE_MS + 1); await purgeSeenMessages(fixture.db);
    expect(count('mesh_seen_messages')).toBe(0);
    expect(await processIncomingMessage(fixture.db, future)).toEqual({ relay: false, reason: 'expired' });
  });

  it('rejects invalid signatures without opening a native writer or claiming', async () => {
    const opened = fixture.opens.length;
    vi.mocked(verifyMeshOrigin).mockResolvedValue(false);
    expect(await processIncomingMessage(fixture.db, packet())).toEqual({ relay: false, reason: 'invalid-signature' });
    expect(fixture.opens).toHaveLength(opened); expect(count('sos_history')).toBe(0);
  });

  it('serialises erasure after a claim still verifying its signature', async () => {
    let finish!: (value: boolean) => void;
    vi.mocked(verifyMeshOrigin).mockImplementationOnce(() => new Promise((resolve) => { finish = resolve; }));
    const pending = processIncomingMessage(fixture.db, packet());
    const wipe = clearAllUserData(fixture.db);
    while (!finish) await Promise.resolve();
    finish(true); await Promise.all([pending, wipe]);
    for (const table of ['mesh_seen_messages', 'sos_history', 'mesh_origin_rate']) expect(count(table)).toBe(0);
    expect(fixture.statements.indexOf('VACUUM;')).toBeGreaterThan(fixture.statements.findIndex((sql) => sql.includes('INSERT INTO sos_history')));
  });

  it('does not collide BEGIN across claims, profile, settings and another handle', async () => {
    const other = fixture.connection();
    // Register this second synthetic provider handle through the same migration.
    await migrateDatabase(other, 'a'.repeat(64));
    await Promise.all([
      ...Array.from({ length: 6 }, (_, i) => processIncomingMessage(i % 2 ? other : fixture.db, packet(`message-${i}`, `origin-${i}`))),
      saveProfileWithContacts(fixture.db, profile, contacts), setSetting(fixture.db, 'language', 'fr'),
    ]);
    expect(count('sos_history')).toBe(6); expect(count('user_profile')).toBe(1); expect(count('emergency_contacts')).toBe(2);
  });

  it('enforces both age and capacity retention without removing medical data', async () => {
    await saveProfileWithContacts(fixture.db, profile, contacts);
    const insert = fixture.engine.prepare("INSERT INTO sos_history(message_id,direction,emergency_type,severity,payload_json,created_at) VALUES (?,'sent','medical','critique',?,?)");
    insert.run('old', JSON.stringify(packet('old')), NOW - MESH_HISTORY_RETENTION_MS - 1);
    for (let i = 0; i < MESH_HISTORY_MAX_ROWS + 5; i++) insert.run(`capacity-${i}`, JSON.stringify(packet(`capacity-${i}`)), NOW);
    await purgeSeenMessages(fixture.db);
    expect(count('sos_history')).toBe(MESH_HISTORY_MAX_ROWS);
    expect(fixture.engine.prepare("SELECT id FROM sos_history WHERE message_id IN ('old','capacity-0')").all()).toHaveLength(0);
    expect(await getRecentMeshMessages(fixture.db)).toHaveLength(30);
    expect(count('user_profile')).toBe(1); expect(count('emergency_contacts')).toBe(2);
    expect(MESH_SEEN_RETENTION_MS).toBe(MESH_MESSAGE_MAX_AGE_MS);
    expect(MESH_RATE_RETENTION_MS).toBe(MESH_ORIGIN_RATE_WINDOW_MS);
  });

  it('migrates v2 additively while preserving profiles, contacts and legacy duplicates', async () => {
    await saveProfileWithContacts(fixture.db, profile, contacts);
    fixture.engine.exec('PRAGMA user_version=2; DROP INDEX sos_history_created_idx; DROP INDEX sos_history_message_idx;');
    const insert = fixture.engine.prepare("INSERT INTO sos_history(message_id,direction,emergency_type,severity,payload_json,created_at) VALUES ('legacy','received','medical','critique','{}',?)");
    insert.run(NOW); insert.run(NOW);
    const before = fixture.engine.prepare('SELECT * FROM user_profile').all();
    const beforeContacts = fixture.engine.prepare('SELECT * FROM emergency_contacts').all();
    await migrateDatabase(fixture.db, 'a'.repeat(64));
    expect(fixture.engine.prepare('SELECT * FROM user_profile').all()).toEqual(before);
    expect(fixture.engine.prepare('SELECT * FROM emergency_contacts').all()).toEqual(beforeContacts);
    expect(count('sos_history')).toBe(2);
    expect(fixture.engine.prepare('PRAGMA user_version').get()!.user_version).toBe(3);
    const indexes = fixture.engine.prepare("SELECT name FROM sqlite_master WHERE type='index'").all().map((row) => row.name);
    expect(indexes).toEqual(expect.arrayContaining(['mesh_seen_seen_at_idx', 'mesh_origin_window_idx', 'sos_history_created_idx', 'sos_history_message_idx']));
    const plan = fixture.engine.prepare('EXPLAIN QUERY PLAN SELECT payload_json FROM sos_history ORDER BY created_at DESC,id DESC LIMIT 30').all();
    expect(plan.some((row) => String(row.detail).includes('sos_history_created_idx'))).toBe(true);
  });

  it('preserves a v2 claim whose signed timestamp could still be valid after 30 minutes', async () => {
    fixture.engine.exec('PRAGMA user_version=2;');
    fixture.engine.prepare("INSERT INTO mesh_seen_messages VALUES ('legacy-future',?)").run(NOW - 31 * 60 * 1000);
    await migrateDatabase(fixture.db, 'a'.repeat(64));
    await purgeSeenMessages(fixture.db);
    const futureAtReceipt = { ...packet('legacy-future'), createdAt: NOW - 26 * 60 * 1000 };
    expect(await processIncomingMessage(fixture.db, futureAtReceipt)).toEqual({ relay: false, reason: 'duplicate' });
  });

  it('rolls migration indexes and user_version back together on failure', async () => {
    fixture.engine.exec('PRAGMA user_version=2; DROP INDEX sos_history_created_idx;');
    fixture.failOnce = 'DELETE FROM mesh_seen_messages';
    await expect(migrateDatabase(fixture.db, 'a'.repeat(64))).rejects.toThrow('Synthetic SQLite failure');
    expect(fixture.engine.prepare('PRAGMA user_version').get()!.user_version).toBe(2);
    expect(fixture.engine.prepare("SELECT name FROM sqlite_master WHERE name='sos_history_created_idx'").get()).toBeUndefined();
    await migrateDatabase(fixture.db, 'a'.repeat(64));
    expect(fixture.engine.prepare('PRAGMA user_version').get()!.user_version).toBe(3);
  });

  it('atomically saves only one dossier and its contacts, preserving another profile', async () => {
    await saveProfile(fixture.db, { ...profile, phone: 'other-profile' });
    await replaceContacts(fixture.db, 'other-profile', contacts.slice(0, 1));
    await saveProfileWithContacts(fixture.db, profile, contacts);
    fixture.failOnce = 'INSERT INTO emergency_contacts';
    await expect(saveProfileWithContacts(fixture.db, { ...profile, name: 'Must roll back' }, contacts.slice(0, 1))).rejects.toThrow();
    expect(fixture.engine.prepare('SELECT name FROM user_profile WHERE phone=?').get(profile.phone)!.name).toBe(profile.name);
    expect(fixture.engine.prepare('SELECT count(*) AS n FROM emergency_contacts WHERE profile_phone=?').get(profile.phone)!.n).toBe(2);
    expect(count('user_profile')).toBe(2);
    expect(fixture.engine.prepare('SELECT count(*) AS n FROM emergency_contacts WHERE profile_phone=?').get('other-profile')!.n).toBe(1);
  });

  it('imports atomically with its two-contact limit and erases every table on request', async () => {
    await saveProfileWithContacts(fixture.db, { ...profile, phone: 'old-profile' }, contacts);
    await replaceProfileFromImport(fixture.db, profile, [...contacts, { name: 'Ignored', phone: '+22373333333' }]);
    expect(fixture.engine.prepare('SELECT phone FROM user_profile').all()).toEqual([{ phone: profile.phone }]);
    expect(count('emergency_contacts')).toBe(2);
    await clearAllUserData(fixture.db);
    for (const table of ['user_profile', 'emergency_contacts', 'app_settings', 'rescuer_opt_in', 'mesh_seen_messages', 'mesh_origin_rate', 'sos_history']) expect(count(table)).toBe(0);
    expect(fixture.statements).toContain('PRAGMA secure_delete = ON;');
    expect(fixture.statements.at(-1)).toBe('VACUUM;');
  });

  it('refuses to use an unverified cipher and closes the failed dedicated connection', async () => {
    await closeDatabaseWriter(fixture.db);
    const opened = fixture.opens.length;
    fixture.cipherAvailable = false;
    await expect(setSetting(fixture.db, 'language', 'fr')).rejects.toThrow('SQLCipher indisponible');
    expect(fixture.opens).toHaveLength(opened + 1);
    expect(fixture.closedConnections).toBe(fixture.opens.length);
    fixture.cipherAvailable = true;
    await setSetting(fixture.db, 'language', 'fr');
  });
});

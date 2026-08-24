import { describe, expect, it, vi } from 'vitest';

import { migrateDatabase, replaceProfileFromImport } from '../database';

describe('database lifecycle', () => {
  it('enables foreign keys again when an existing encrypted database opens', async () => {
    const execAsync = vi.fn().mockResolvedValue(undefined);
    const getFirstAsync = vi.fn()
      .mockResolvedValueOnce({ cipher_version: '4.6.1' })
      .mockResolvedValueOnce({ user_version: 2 });
    const db = { execAsync, getFirstAsync } as never;

    await migrateDatabase(db, 'a'.repeat(64));

    expect(execAsync).toHaveBeenCalledWith('PRAGMA foreign_keys = ON;');
  });

  it('atomically removes the previous dossier before importing one replacement', async () => {
    const statements: string[] = [];
    const runAsync = vi.fn(async (sql: string) => { statements.push(sql); });
    const withTransactionAsync = vi.fn(async (operation: () => Promise<void>) => operation());
    const db = { runAsync, withTransactionAsync } as never;
    const profile = {
      phone: '+22370000000',
      name: 'Awa Traoré',
      bloodType: 'O+',
      allergies: 'Pénicilline',
      treatments: '',
      history: '',
      photoUri: null,
      includeInSos: true,
      updatedAt: 1,
    };

    await replaceProfileFromImport(db, profile, [
      { name: 'Moussa', phone: '+22371111111' },
      { name: 'Fatou', phone: '+22372222222' },
      { name: 'Ignoré', phone: '+22373333333' },
    ]);

    expect(withTransactionAsync).toHaveBeenCalledOnce();
    expect(statements.slice(0, 3)).toEqual([
      'DELETE FROM emergency_contacts',
      'DELETE FROM user_profile',
      expect.stringContaining('INSERT INTO user_profile'),
    ]);
    expect(statements.filter((sql) => sql.startsWith('INSERT INTO emergency_contacts'))).toHaveLength(2);
  });
});

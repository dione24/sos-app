import { describe, expect, it, vi } from 'vitest';

import { createMedicalExport, MEDICAL_IMPORT_MAX_BYTES, parseMedicalExport, readMedicalImport } from '../medical-export';

const profile = {
  phone: '+22370000000',
  name: 'Awa Traoré',
  bloodType: 'O+',
  allergies: 'Pénicilline',
  treatments: '',
  history: '',
  photoUri: 'file:///private/photo.jpg',
  includeInSos: true,
  updatedAt: 1,
};

describe('medical export', () => {
  it('omits local photo paths and accepts its own V2 format', () => {
    const value = createMedicalExport(profile, [{ name: 'Moussa', phone: '+22371111111' }]);
    expect(JSON.stringify(value)).not.toContain('photo.jpg');
    expect(parseMedicalExport(JSON.stringify(value)).profile.bloodType).toBe('O+');
  });

  it('rejects unknown fields and oversized medical content', () => {
    const value = createMedicalExport(profile, []);
    expect(() => parseMedicalExport(JSON.stringify({ ...value, injected: true }))).toThrow();
    expect(() => createMedicalExport({ ...profile, allergies: 'x'.repeat(501) }, [])).toThrow();
  });

  it('limits exports to two valid contacts', () => {
    const value = createMedicalExport(profile, [
      { name: 'A', phone: '111' },
      { name: '', phone: '222' },
      { name: 'B', phone: '333' },
      { name: 'C', phone: '444' },
    ]);
    expect(value.contacts.map(({ name }) => name)).toEqual(['A', 'B']);
  });

  it('rejects oversized documents before JSON parsing, including multibyte content', () => {
    expect(() => parseMedicalExport('['.repeat(MEDICAL_IMPORT_MAX_BYTES + 1))).toThrow('32 Ko');
    const value = JSON.stringify(createMedicalExport(profile, []));
    expect(() => parseMedicalExport(value + ' '.repeat(MEDICAL_IMPORT_MAX_BYTES))).toThrow('32 Ko');
    expect(() => parseMedicalExport('é'.repeat(MEDICAL_IMPORT_MAX_BYTES))).toThrow('32 Ko');
  });

  it('refuses non-numeric primary phones and incomplete contacts before replacing a saved dossier', () => {
    const valid = createMedicalExport(profile, []);
    expect(() => parseMedicalExport(JSON.stringify({ ...valid, profile: { ...valid.profile, phone: 'abcdefgh' } }))).toThrow();
    expect(() => parseMedicalExport(JSON.stringify({ ...valid, contacts: [{ name: 'Contact fictif', phone: '123' }] }))).toThrow();
  });

  it('checks the picked copy size before reading and always removes that copy', async () => {
    const file = { size: MEDICAL_IMPORT_MAX_BYTES + 1, text: vi.fn(), delete: vi.fn() };
    await expect(readMedicalImport(file)).rejects.toThrow('32 Ko');
    expect(file.text).not.toHaveBeenCalled();
    expect(file.delete).toHaveBeenCalledOnce();
  });

  it('removes an invalid copy after parsing fails and a valid copy before confirmation', async () => {
    const invalid = { size: 5, text: vi.fn(async () => 'wrong'), delete: vi.fn() };
    await expect(readMedicalImport(invalid)).rejects.toThrow();
    expect(invalid.delete).toHaveBeenCalledOnce();
    const text = JSON.stringify(createMedicalExport(profile, []));
    const valid = { size: text.length, text: vi.fn(async () => text), delete: vi.fn() };
    await expect(readMedicalImport(valid)).resolves.toMatchObject({ profile: { name: profile.name } });
    expect(valid.delete).toHaveBeenCalledOnce();
  });
});

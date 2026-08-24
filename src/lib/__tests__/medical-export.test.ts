import { describe, expect, it } from 'vitest';

import { createMedicalExport, parseMedicalExport } from '../medical-export';

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
});

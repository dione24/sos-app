import { describe, expect, it } from 'vitest';
import { validateMedicalDraft } from '../medical-draft';

const profile = {
  phone: '+22300000000', name: 'Dossier fictif', bloodType: '', allergies: '',
  treatments: '', history: '', photoUri: null, includeInSos: false, updatedAt: 1,
};

describe('medical draft validation on save', () => {
  it.each(['', '1', '12', '+223'])('keeps an incomplete named contact editable without throwing (%s)', (phone) => {
    expect(validateMedicalDraft(profile, [{ name: 'Contact fictif', phone }])).toMatchObject({ ok: false });
  });

  it('ignores untouched optional contacts and normalizes complete contacts', () => {
    expect(validateMedicalDraft(profile, [{ name: '', phone: '+223 ' }])).toEqual({ ok: true, contacts: [] });
    expect(validateMedicalDraft(profile, [{ name: ' Contact fictif ', phone: ' +22300000001 ' }])).toEqual({
      ok: true, contacts: [{ name: 'Contact fictif', phone: '+22300000001' }],
    });
  });

  it('requires a name for a filled phone and a complete primary phone', () => {
    expect(validateMedicalDraft(profile, [{ name: '', phone: '+22300000001' }])).toMatchObject({ ok: false });
    expect(validateMedicalDraft({ ...profile, phone: '+223' }, [])).toMatchObject({ ok: false });
  });
});

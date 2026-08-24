import { describe, expect, it } from 'vitest';

import { EMERGENCY_NUMBERS } from '@/data';
import { contactRecipients, formatSosMessage, selectAlternateEmergencyNumbers, selectEmergencyNumber } from '@/lib/sos';
import type { MedicalProfile } from '@/types/models';

const profile: MedicalProfile = {
  phone: '+223 70 00 00 00',
  name: 'Awa Traoré',
  bloodType: 'O+',
  allergies: 'Pénicilline',
  treatments: '',
  history: '',
  photoUri: null,
  includeInSos: true,
  updatedAt: 1,
};

describe('SOS SMS formatting', () => {
  it('includes raw coordinates and two link formats', () => {
    const result = formatSosMessage({
      type: 'accident',
      position: { latitude: 12.6392, longitude: -8.0029 },
    });
    expect(result).toContain('12.639200, -8.002900');
    expect(result).toContain('https://maps.google.com/?q=12.6392,-8.0029');
    expect(result).toContain('geo:12.6392,-8.0029');
  });

  it('has an explicit offline-safe fallback when GPS is missing', () => {
    const result = formatSosMessage({ type: 'medical', position: null });
    expect(result).toContain('Position GPS indisponible');
    expect(result).not.toContain('maps.google.com');
  });

  it('only includes the limited medical summary after opt-in', () => {
    const withoutOptIn = formatSosMessage({ type: 'medical', position: null, profile, includeMedical: false });
    const withOptIn = formatSosMessage({ type: 'medical', position: null, profile, includeMedical: true });
    expect(withoutOptIn).not.toContain('Pénicilline');
    expect(withOptIn).toContain('Groupe sanguin : O+');
    expect(withOptIn).toContain('Allergies : Pénicilline');
    expect(withOptIn).not.toContain(profile.phone);
  });

  it('normalizes contact numbers for the native SMS composer', () => {
    expect(contactRecipients([
      { name: 'A', phone: '+223 70 12 34 56' },
      { name: 'B', phone: '66-12-34-56' },
    ])).toEqual(['+22370123456', '66123456']);
  });

  it('rejects incomplete placeholders and bare country codes', () => {
    expect(contactRecipients([
      { name: 'Vide', phone: '+223 ' },
      { name: 'Code seul', phone: '+223' },
      { name: 'Court', phone: '70 12' },
      { name: 'Valide', phone: '+223 76 00 00 00' },
      { name: 'Doublon', phone: '+22376000000' },
    ])).toEqual(['+22376000000']);
  });
});

describe('routage des appels vitaux', () => {
  it.each(['medical', 'accident', 'incendie', 'noyade'] as const)(
    'route %s vers la Protection Civile au 122',
    (type) => expect(selectEmergencyNumber(type, EMERGENCY_NUMBERS)?.number).toBe('122'),
  );

  it('route une agression vers la Police et garde la Gendarmerie en alternative', () => {
    expect(selectEmergencyNumber('agression', EMERGENCY_NUMBERS)?.number).toBe('101');
    expect(selectAlternateEmergencyNumbers('agression', EMERGENCY_NUMBERS).map((item) => item.number)).toContain('111');
  });

  it('ne présente pas le 36061 comme numéro de secours vital principal', () => {
    expect(selectEmergencyNumber('medical', EMERGENCY_NUMBERS)?.number).toBe('122');
    expect(selectAlternateEmergencyNumbers('medical', EMERGENCY_NUMBERS)[0]?.number).toBe('36061');
  });

  it('décrit correctement le 133 comme un signalement spécialisé', () => {
    const number = EMERGENCY_NUMBERS.find((item) => item.number === '133');
    expect(number?.category).toBe('signalement');
    expect(number?.types).toEqual([]);
    expect(number?.description.toLowerCase()).toContain('armes légères');
  });
});

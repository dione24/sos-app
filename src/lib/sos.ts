import type {
  Coordinates,
  EmergencyContact,
  EmergencyNumber,
  EmergencyType,
  MedicalProfile,
} from '@/types/models';

export const EMERGENCY_LABELS: Record<EmergencyType, string> = {
  medical: 'Urgence médicale',
  accident: 'Accident',
  agression: 'Agression',
  incendie: 'Incendie',
  noyade: 'Noyade',
  autre: 'Urgence',
};

export const PRIMARY_EMERGENCY_NUMBER: Record<EmergencyType, string> = {
  medical: '122',
  accident: '122',
  agression: '101',
  incendie: '122',
  noyade: '122',
  autre: '122',
};

export const ALTERNATE_EMERGENCY_NUMBERS: Record<EmergencyType, string[]> = {
  medical: ['36061', '80 00 12 01', '20 22 80 81'],
  accident: ['144', '80 00 12 01', '20 22 80 81'],
  agression: ['111', '145', '80 00 11 15', '80 00 11 14'],
  incendie: ['144', '80 00 12 01', '20 22 80 81'],
  noyade: ['144', '80 00 12 01', '20 22 80 81'],
  autre: ['101', '111', '144'],
};

export function selectEmergencyNumber(type: EmergencyType, numbers: EmergencyNumber[]) {
  const primary = PRIMARY_EMERGENCY_NUMBER[type];
  return numbers.find((item) => item.number === primary) ?? numbers.find((item) => item.number === '122');
}

export function selectAlternateEmergencyNumbers(type: EmergencyType, numbers: EmergencyNumber[]) {
  const order = ALTERNATE_EMERGENCY_NUMBERS[type];
  return order
    .map((number) => numbers.find((item) => item.number === number))
    .filter((item): item is EmergencyNumber => Boolean(item));
}

export function formatCoordinates(position: Coordinates | null) {
  if (!position) return 'Position GPS indisponible';
  return `${position.latitude.toFixed(6)}, ${position.longitude.toFixed(6)}`;
}

type SosMessageOptions = {
  type: EmergencyType;
  position: Coordinates | null;
  profile?: MedicalProfile | null;
  includeMedical?: boolean;
};

export function formatSosMessage({ type, position, profile, includeMedical }: SosMessageOptions) {
  const coordinates = formatCoordinates(position);
  const lines = [
    `SOS — ${EMERGENCY_LABELS[type]}`,
    `Position : ${coordinates}`,
  ];

  if (position) {
    if (position.timestamp && Date.now() - position.timestamp >= 5 * 60 * 1000) {
      lines.push(`Dernière position connue, relevée à ${new Date(position.timestamp).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })} : à confirmer.`);
    }
    lines.push(`Carte : https://maps.google.com/?q=${position.latitude},${position.longitude}`);
    lines.push(`URI GPS : geo:${position.latitude},${position.longitude}`);
  }

  if (includeMedical && profile?.includeInSos) {
    if (profile.bloodType.trim()) lines.push(`Groupe sanguin : ${profile.bloodType.trim()}`);
    if (profile.allergies.trim()) lines.push(`Allergies : ${profile.allergies.trim()}`);
  }

  lines.push(`Envoyé depuis Nafalan à ${new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}.`);
  return lines.join('\n');
}

/** Minimum significant digits for an emergency SMS recipient (local or E.164). */
export const MIN_EMERGENCY_PHONE_DIGITS = 8;

export function normalizePhoneNumber(phone: string) {
  return phone.replace(/[^+\d]/g, '');
}

/**
 * Accepts usable dialable numbers and rejects placeholders such as bare "+223"
 * or incomplete drafts left in the medical dossier form.
 */
export function isValidEmergencyPhone(phone: string) {
  const normalized = normalizePhoneNumber(phone);
  if (!normalized) return false;
  const digits = normalized.replace(/\D/g, '');
  if (digits.length < MIN_EMERGENCY_PHONE_DIGITS) return false;
  // Mali country code alone is never a destination.
  if (digits === '223') return false;
  return true;
}

export function contactRecipients(contacts: EmergencyContact[]) {
  const seen = new Set<string>();
  const recipients: string[] = [];
  for (const contact of contacts) {
    const normalized = normalizePhoneNumber(contact.phone);
    if (!isValidEmergencyPhone(normalized) || seen.has(normalized)) continue;
    seen.add(normalized);
    recipients.push(normalized);
  }
  return recipients;
}

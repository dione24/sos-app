import { z } from 'zod';

import type { EmergencyContact, MedicalProfile } from '@/types/models';
import { isValidEmergencyPhone } from '@/lib/sos';

// A V2 dossier has two contacts and three fields capped at 500 characters.
// Leave room for UTF-8 and metadata, but reject arbitrary documents before parse.
export const MEDICAL_IMPORT_MAX_BYTES = 32 * 1024;

export function assertMedicalImportSize(bytes: number) {
  if (!Number.isFinite(bytes) || bytes <= 0 || bytes > MEDICAL_IMPORT_MAX_BYTES) {
    throw new Error('Le fichier médical doit contenir au maximum 32 Ko.');
  }
}

export async function readMedicalImport(file: {
  size: number;
  text(): Promise<string>;
  delete(): void;
}) {
  try {
    assertMedicalImportSize(file.size);
    return parseMedicalExport(await file.text());
  } finally {
    // The caller passes only the private copy made by DocumentPicker, never
    // the original document selected in iCloud/Drive/the file provider.
    file.delete();
  }
}

const contactSchema = z.object({
  name: z.string().trim().min(1).max(80),
  phone: z.string().trim().min(3).max(32),
}).strict();

const importedContactSchema = contactSchema.extend({
  phone: z.string().trim().min(8).max(32).refine(isValidEmergencyPhone),
});

const payloadSchema = z.object({
  schema: z.literal('sos-mali-medical-v2'),
  exportedAt: z.number().int().positive(),
  profile: z.object({
    phone: z.string().trim().min(8).max(32),
    name: z.string().trim().max(120),
    bloodType: z.string().trim().max(8),
    allergies: z.string().trim().max(500),
    treatments: z.string().trim().max(500),
    history: z.string().trim().max(500),
    includeInSos: z.boolean(),
  }).strict(),
  contacts: z.array(contactSchema).max(2),
}).strict();

// Old saved dossiers can still be viewed/edited/exported without changing
// their stored values. New imports must not install an unusable primary phone.
const importSchema = payloadSchema.extend({
  profile: payloadSchema.shape.profile.extend({ phone: z.string().trim().min(8).max(32).refine(isValidEmergencyPhone) }),
  contacts: z.array(importedContactSchema).max(2),
});

export function createMedicalExport(profile: MedicalProfile, contacts: EmergencyContact[]) {
  return payloadSchema.parse({
    schema: 'sos-mali-medical-v2',
    exportedAt: Date.now(),
    profile: {
      phone: profile.phone,
      name: profile.name,
      bloodType: profile.bloodType,
      allergies: profile.allergies,
      treatments: profile.treatments,
      history: profile.history,
      includeInSos: profile.includeInSos,
    },
    contacts: contacts
      .filter((contact) => contact.name.trim() && contact.phone.trim())
      .slice(0, 2)
      .map(({ name, phone }) => ({ name, phone })),
  });
}

export function parseMedicalExport(value: string) {
  // Check characters first so a huge string cannot allocate a second huge
  // UTF-8 buffer just to find out it is too large.
  assertMedicalImportSize(value.length);
  assertMedicalImportSize(new TextEncoder().encode(value).byteLength);
  const parsed: unknown = JSON.parse(value);
  return importSchema.parse(parsed);
}

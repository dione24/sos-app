import { z } from 'zod';

import type { EmergencyContact, MedicalProfile } from '@/types/models';

const contactSchema = z.object({
  name: z.string().trim().min(1).max(80),
  phone: z.string().trim().min(3).max(32),
}).strict();

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
  const parsed: unknown = JSON.parse(value);
  return payloadSchema.parse(parsed);
}

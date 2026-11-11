import { isValidEmergencyPhone } from '@/lib/sos';
import type { EmergencyContact, MedicalProfile } from '@/types/models';

/** Drafts may contain intermediate values; validation belongs to Save, not render. */
export function validateMedicalDraft(profile: MedicalProfile, contacts: EmergencyContact[]) {
  if (!isValidEmergencyPhone(profile.phone)) {
    return { ok: false as const, message: 'Saisissez votre numéro complet (au moins 8 chiffres).' };
  }
  const complete: EmergencyContact[] = [];
  for (const [index, contact] of contacts.slice(0, 2).entries()) {
    const name = contact.name.trim();
    const phone = contact.phone.trim();
    if (!name && (!phone || phone === '+223')) continue;
    if (!name) {
      return { ok: false as const, message: `Ajoutez le nom du contact ${index + 1}, ou videz son numéro.` };
    }
    if (!isValidEmergencyPhone(phone)) {
      return { ok: false as const, message: `Saisissez un numéro complet pour le contact ${index + 1} (au moins 8 chiffres).` };
    }
    complete.push({ name, phone });
  }
  return { ok: true as const, contacts: complete };
}

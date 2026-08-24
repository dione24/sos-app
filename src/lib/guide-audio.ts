import type { Language } from '@/types/models';

/**
 * Pre-generated narration only — never runtime system TTS.
 * Register each file with a static require() so Metro bundles it.
 *
 * Convention:
 *   assets/audio/fr/{guideId}/{stepId}.mp3
 *   assets/audio/bambara/{guideId}/{stepId}.mp3
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const AUDIO_REGISTRY: Record<string, any> = {
  'fr/rcp/securite': require('../../assets/audio/fr/rcp/securite.mp3'),
  'fr/rcp/reaction': require('../../assets/audio/fr/rcp/reaction.mp3'),
  'fr/rcp/respiration': require('../../assets/audio/fr/rcp/respiration.mp3'),
  'fr/rcp/appel': require('../../assets/audio/fr/rcp/appel.mp3'),
  'fr/rcp/position': require('../../assets/audio/fr/rcp/position.mp3'),
  'fr/rcp/compressions': require('../../assets/audio/fr/rcp/compressions.mp3'),
  'fr/rcp/continuer': require('../../assets/audio/fr/rcp/continuer.mp3'),
  'fr/hemorragie/protection': require('../../assets/audio/fr/hemorragie/protection.mp3'),
  'fr/hemorragie/pression': require('../../assets/audio/fr/hemorragie/pression.mp3'),
  'fr/hemorragie/maintien': require('../../assets/audio/fr/hemorragie/maintien.mp3'),
  'fr/hemorragie/appel': require('../../assets/audio/fr/hemorragie/appel.mp3'),
  'fr/pls/verifier': require('../../assets/audio/fr/pls/verifier.mp3'),
  'fr/pls/appel': require('../../assets/audio/fr/pls/appel.mp3'),
  'fr/pls/tourner': require('../../assets/audio/fr/pls/tourner.mp3'),
  'fr/pls/surveiller': require('../../assets/audio/fr/pls/surveiller.mp3'),
  'fr/brulure/stopper': require('../../assets/audio/fr/brulure/stopper.mp3'),
  'fr/brulure/retirer': require('../../assets/audio/fr/brulure/retirer.mp3'),
  'fr/brulure/refroidir': require('../../assets/audio/fr/brulure/refroidir.mp3'),
  'fr/brulure/couvrir': require('../../assets/audio/fr/brulure/couvrir.mp3'),
  'fr/etouffement/toux': require('../../assets/audio/fr/etouffement/toux.mp3'),
  'fr/etouffement/claques': require('../../assets/audio/fr/etouffement/claques.mp3'),
  'fr/etouffement/compressions': require('../../assets/audio/fr/etouffement/compressions.mp3'),
  'fr/etouffement/alterner': require('../../assets/audio/fr/etouffement/alterner.mp3'),
  'fr/etouffement/inconscient': require('../../assets/audio/fr/etouffement/inconscient.mp3'),
  'fr/serpent/eloigner': require('../../assets/audio/fr/serpent/eloigner.mp3'),
  'fr/serpent/calmer': require('../../assets/audio/fr/serpent/calmer.mp3'),
  'fr/serpent/immobiliser': require('../../assets/audio/fr/serpent/immobiliser.mp3'),
  'fr/serpent/interdits': require('../../assets/audio/fr/serpent/interdits.mp3'),
  'fr/serpent/secours': require('../../assets/audio/fr/serpent/secours.mp3'),
  'fr/malaise-cardiaque/repos': require('../../assets/audio/fr/malaise-cardiaque/repos.mp3'),
  'fr/malaise-cardiaque/appel': require('../../assets/audio/fr/malaise-cardiaque/appel.mp3'),
  'fr/malaise-cardiaque/surveiller': require('../../assets/audio/fr/malaise-cardiaque/surveiller.mp3'),
  'fr/malaise-cardiaque/rcp': require('../../assets/audio/fr/malaise-cardiaque/rcp.mp3'),
  'fr/noyade/securite': require('../../assets/audio/fr/noyade/securite.mp3'),
  'fr/noyade/appel': require('../../assets/audio/fr/noyade/appel.mp3'),
  'fr/noyade/respiration': require('../../assets/audio/fr/noyade/respiration.mp3'),
  'fr/noyade/rcp': require('../../assets/audio/fr/noyade/rcp.mp3'),
  'fr/noyade/chaud': require('../../assets/audio/fr/noyade/chaud.mp3'),
  'fr/electrocution/couper': require('../../assets/audio/fr/electrocution/couper.mp3'),
  'fr/electrocution/appel': require('../../assets/audio/fr/electrocution/appel.mp3'),
  'fr/electrocution/respiration': require('../../assets/audio/fr/electrocution/respiration.mp3'),
  'fr/electrocution/brulures': require('../../assets/audio/fr/electrocution/brulures.mp3'),
  'fr/fracture/immobile': require('../../assets/audio/fr/fracture/immobile.mp3'),
  'fr/fracture/saignement': require('../../assets/audio/fr/fracture/saignement.mp3'),
  'fr/fracture/soutenir': require('../../assets/audio/fr/fracture/soutenir.mp3'),
  'fr/fracture/froid': require('../../assets/audio/fr/fracture/froid.mp3'),
  'fr/fracture/secours': require('../../assets/audio/fr/fracture/secours.mp3'),
  // 'bambara/rcp/securite': require('../../assets/audio/bambara/rcp/securite.mp3'),
};

export function guideAudioKey(language: Language, guideId: string, stepId: string) {
  const folder = language === 'bm' ? 'bambara' : 'fr';
  return `${folder}/${guideId}/${stepId}`;
}

export function resolveGuideAudio(language: Language, guideId: string, stepId: string) {
  const key = guideAudioKey(language, guideId, stepId);
  const moduleId = AUDIO_REGISTRY[key];
  if (moduleId) return { key, source: moduleId as number, isFallback: false };

  // Bambara narration is not recorded yet. In an emergency a French voice the
  // listener can act on beats silence, so fall back instead of disabling audio.
  if (language !== 'fr') {
    const frenchKey = guideAudioKey('fr', guideId, stepId);
    const frenchModule = AUDIO_REGISTRY[frenchKey];
    if (frenchModule) return { key: frenchKey, source: frenchModule as number, isFallback: true };
  }
  return null;
}

export function hasGuideAudio(language: Language, guideId: string, stepId: string) {
  return Boolean(resolveGuideAudio(language, guideId, stepId));
}

export function countRegisteredGuideAudio() {
  return Object.keys(AUDIO_REGISTRY).length;
}

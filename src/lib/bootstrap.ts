import type { SQLiteDatabase } from 'expo-sqlite';

import { getSetting, setSetting } from '@/db/database';

export type BootstrapState = { needsOnboarding: boolean };

export async function readBootstrapState(db: SQLiteDatabase): Promise<BootstrapState> {
  // Le démarrage a seulement besoin de savoir si un dossier existe.
  const [profile, skipped, language] = await Promise.all([
    db.getFirstAsync<{ present: number }>('SELECT EXISTS(SELECT 1 FROM user_profile) AS present'),
    getSetting(db, 'onboarding_skipped'),
    getSetting(db, 'language'),
  ]);
  if (language === 'bm') await setSetting(db, 'language', 'fr');
  return { needsOnboarding: !profile?.present && skipped !== '1' };
}

/**
 * L'onboarding est une étape de premier démarrage, pas un contrôle à chaque
 * navigation. La suppression des données ouvre elle-même /onboarding ; créer
 * ou passer le dossier doit ensuite laisser accéder au SOS sans nouveau délai.
 */
export function createBootstrapSession(readState: () => Promise<BootstrapState>) {
  let pending: Promise<BootstrapState> | undefined;
  let onboardingVisited = false;

  return async (pathname: string): Promise<'/onboarding' | null> => {
    if (pathname === '/onboarding') onboardingVisited = true;
    pending ??= readState();
    const state = await pending;
    return state.needsOnboarding && !onboardingVisited ? '/onboarding' : null;
  };
}

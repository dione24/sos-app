import { describe, expect, it, vi } from 'vitest';

import { createBootstrapSession, readBootstrapState, type BootstrapState } from '@/lib/bootstrap';

function setup({ profile = false, skipped, language = 'fr' }: { profile?: boolean; skipped?: string; language?: string } = {}) {
  const data = { profile, settings: { onboarding_skipped: skipped, language } as Record<string, string | undefined> };
  const getFirstAsync = vi.fn(async (sql: string, key?: string) => {
    if (sql.startsWith('SELECT EXISTS')) return { present: Number(data.profile) };
    const value = data.settings[key ?? ''];
    return value == null ? null : { value };
  });
  const runAsync = vi.fn(async (_sql: string, key: string, value: string) => {
    data.settings[key] = value;
  });
  const db = { getFirstAsync, runAsync } as never;
  return { data, getFirstAsync, runAsync, createSession: () => createBootstrapSession(() => readBootstrapState(db)) };
}

describe('navigation après le démarrage sécurisé', () => {
  it('ne relit pas le dossier et les préférences pendant un parcours normal', async () => {
    const { createSession, getFirstAsync } = setup({ profile: true });
    const navigate = createSession();

    for (const path of ['/', '/map', '/settings', '/map', '/guide/brulure', '/sos', '/']) {
      expect(await navigate(path)).toBeNull();
    }

    expect(getFirstAsync).toHaveBeenCalledTimes(3);
    expect(getFirstAsync.mock.calls[0]?.[0]).not.toContain('SELECT *');
  });

  it('laisse accéder directement au SOS quand le dossier a déjà été passé', async () => {
    const { createSession } = setup({ skipped: '1' });
    expect(await createSession()('/sos')).toBeNull();
  });

  it.each(['create', 'skip'] as const)('ne reboucle pas vers l’onboarding après %s', async (action) => {
    const { createSession, data, getFirstAsync } = setup();
    const navigate = createSession();

    expect(await navigate('/')).toBe('/onboarding');
    expect(await navigate('/onboarding')).toBeNull();
    if (action === 'create') data.profile = true;
    else data.settings.onboarding_skipped = '1';
    expect(await navigate('/')).toBeNull();
    expect(await navigate('/sos')).toBeNull();
    expect(getFirstAsync).toHaveBeenCalledTimes(3);
  });

  it('permet le retour explicite à l’onboarding après suppression, puis un nouveau départ', async () => {
    const { createSession, data, getFirstAsync } = setup({ profile: true, skipped: '1' });
    const navigate = createSession();
    expect(await navigate('/')).toBeNull();
    expect(await navigate('/privacy')).toBeNull();

    data.profile = false;
    data.settings = {};
    expect(await navigate('/onboarding')).toBeNull();
    data.settings.onboarding_skipped = '1';
    expect(await navigate('/')).toBeNull();
    expect(await navigate('/sos')).toBeNull();
    expect(getFirstAsync).toHaveBeenCalledTimes(3);

    // Une nouvelle ouverture revalide bien l'état persistant du téléphone.
    data.settings = {};
    expect(await createSession()('/')).toBe('/onboarding');
    expect(getFirstAsync).toHaveBeenCalledTimes(6);
  });

  it('partage une lecture en cours et ignore une ancienne redirection après arrivée sur l’onboarding', async () => {
    let complete!: (state: BootstrapState) => void;
    const read = vi.fn(() => new Promise<BootstrapState>((resolve) => { complete = resolve; }));
    const navigate = createBootstrapSession(read);
    const first = navigate('/');
    const onboarding = navigate('/onboarding');
    complete({ needsOnboarding: true });

    expect(await first).toBeNull();
    expect(await onboarding).toBeNull();
    expect(await navigate('/sos')).toBeNull();
    expect(read).toHaveBeenCalledOnce();
  });

  it('normalise une ancienne langue une seule fois sans charger les informations médicales', async () => {
    const { createSession, data, runAsync, getFirstAsync } = setup({ language: 'bm', skipped: '1' });
    const navigate = createSession();
    await navigate('/');
    await navigate('/settings');
    await navigate('/sos');

    expect(data.settings.language).toBe('fr');
    expect(runAsync).toHaveBeenCalledOnce();
    expect(getFirstAsync).toHaveBeenCalledTimes(3);
  });

  it('remonte les erreurs de stockage au lieu de valider un état incomplet', async () => {
    const read = vi.fn().mockRejectedValue(new Error('storage unavailable'));
    const navigate = createBootstrapSession(read);
    await expect(navigate('/')).rejects.toThrow('storage unavailable');
    await expect(navigate('/sos')).rejects.toThrow('storage unavailable');
    expect(read).toHaveBeenCalledOnce();
  });
});

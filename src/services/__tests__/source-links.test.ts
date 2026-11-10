import { beforeEach, describe, expect, it, vi } from 'vitest';

const reactNative = vi.hoisted(() => ({ alert: vi.fn(), openURL: vi.fn() }));

vi.mock('react-native', () => ({
  Alert: { alert: reactNative.alert },
  Linking: { openURL: reactNative.openURL },
}));

import { EMERGENCY_NUMBERS } from '@/data';
import { COMMUNITY_MAP_SOURCE, GOVERNMENT_SOURCES, HISTORICAL_GOVERNMENT_SOURCES } from '@/constants/governmentSources';
import { isSafeSourceUrl, openSourceUrl } from '../source-links';

describe('liens des sources publiques', () => {
  beforeEach(() => vi.clearAllMocks());

  it.each(['javascript:alert(1)', 'http://example.com', 'file:///etc/hosts', 'https://user:password@example.com', 'invalide'])('refuse %s avant de lancer le navigateur', async (url) => {
    await expect(openSourceUrl(url)).resolves.toBe(false);
    expect(reactNative.openURL).not.toHaveBeenCalled();
    expect(reactNative.alert).toHaveBeenCalledOnce();
  });

  it('rend toutes les références embarquées ouvrables en HTTPS sans identifiants', () => {
    for (const item of EMERGENCY_NUMBERS) expect(isSafeSourceUrl(item.sourceUrl)).toBe(true);
    for (const source of [...GOVERNMENT_SOURCES, ...HISTORICAL_GOVERNMENT_SOURCES, COMMUNITY_MAP_SOURCE]) {
      expect(isSafeSourceUrl(source.url)).toBe(true);
    }
  });

  it('associe chaque numéro à une source affichée et distingue les contacts non confirmés', () => {
    const currentUrls = new Set(GOVERNMENT_SOURCES.map((source) => source.url));
    const historicalUrls = new Set(HISTORICAL_GOVERNMENT_SOURCES.map((source) => source.url));
    for (const item of EMERGENCY_NUMBERS) {
      expect(currentUrls.has(item.sourceUrl) || historicalUrls.has(item.sourceUrl)).toBe(true);
      if (historicalUrls.has(item.sourceUrl)) expect(item.status).toBe('needs_field_verification');
    }
  });

  it('ouvre le lien exact et conserve les paramètres de la source', async () => {
    reactNative.openURL.mockResolvedValue(undefined);
    const url = EMERGENCY_NUMBERS.find((item) => item.sourceUrl.includes('?'))!.sourceUrl;
    await expect(openSourceUrl(url)).resolves.toBe(true);
    expect(reactNative.openURL).toHaveBeenCalledWith(url);
    expect(reactNative.alert).not.toHaveBeenCalled();
  });

  it('explique un échec sans perdre le parcours courant', async () => {
    reactNative.openURL.mockRejectedValue(new Error('no browser'));
    await expect(openSourceUrl(EMERGENCY_NUMBERS[0]!.sourceUrl)).resolves.toBe(false);
    expect(reactNative.alert).toHaveBeenCalledWith('Source indisponible', expect.stringContaining('connexion'));
  });
});

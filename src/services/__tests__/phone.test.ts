import { beforeEach, describe, expect, it, vi } from 'vitest';

const reactNative = vi.hoisted(() => ({
  alert: vi.fn(),
  canOpenURL: vi.fn(),
  openURL: vi.fn(),
}));

vi.mock('react-native', () => ({
  Alert: { alert: reactNative.alert },
  Linking: {
    canOpenURL: reactNative.canOpenURL,
    openURL: reactNative.openURL,
  },
}));

import { openPhoneDialer } from '../phone';

describe('openPhoneDialer', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('opens the Android dialer directly without a package-visibility precheck', async () => {
    reactNative.openURL.mockResolvedValue(undefined);

    await expect(openPhoneDialer('122')).resolves.toBe(true);

    expect(reactNative.canOpenURL).not.toHaveBeenCalled();
    expect(reactNative.openURL).toHaveBeenCalledWith('tel:122');
    expect(reactNative.alert).not.toHaveBeenCalled();
  });

  it('keeps the manual fallback when Android truly rejects the dialer intent', async () => {
    reactNative.openURL.mockRejectedValue(new Error('no dialer'));

    await expect(openPhoneDialer('122')).resolves.toBe(false);

    expect(reactNative.alert).toHaveBeenCalledWith(
      'Appel impossible',
      "Impossible d'ouvrir le téléphone. Composez manuellement le 122.",
    );
  });
});

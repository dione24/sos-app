import { describe, expect, it } from 'vitest';

import { friendlyBleAdvertisingError, friendlyBleScanError } from '@/lib/ble-errors';

describe('friendlyBleScanError', () => {
  it('replaces the opaque Android scan failure with recovery guidance', () => {
    expect(friendlyBleScanError('Cannot start scanning operation')).toBe(
      'Le service Bluetooth de ce téléphone ne répond pas. Redémarrez le téléphone puis réessayez.',
    );
  });

  it('keeps an unknown cause visible while translating the context', () => {
    expect(friendlyBleScanError('adapter unavailable')).toBe(
      'Scan Bluetooth impossible : adapter unavailable',
    );
  });
});

describe('friendlyBleAdvertisingError', () => {
  it('hides the Expo bridge wrapper and explains a HiOS GATT timeout', () => {
    expect(friendlyBleAdvertisingError(
      "Call to function 'ExpoBleAdvertiser.startAdvertisingAsync' has been rejected.\n→ Caused by: Impossible d'ouvrir le serveur GATT.",
    )).toBe(
      'Le service Bluetooth de ce téléphone ne répond pas. Redémarrez le téléphone puis réessayez.',
    );
  });

  it('keeps a useful native cause without the bridge implementation detail', () => {
    expect(friendlyBleAdvertisingError(
      "Call to function 'ExpoBleAdvertiser.startAdvertisingAsync' has been rejected.\n→ Caused by: Le Bluetooth est désactivé.",
    )).toBe('Le Bluetooth est désactivé.');
  });

  it('uses an actionable fallback for an opaque bridge rejection', () => {
    expect(friendlyBleAdvertisingError(
      "Call to function 'ExpoBleAdvertiser.startAdvertisingAsync' has been rejected.",
    )).toBe('Diffusion Bluetooth impossible. Réessayez ou utilisez l’appel et le SMS.');
  });
});

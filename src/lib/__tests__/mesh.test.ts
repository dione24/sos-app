import { describe, expect, it } from 'vitest';

import { decideRelay, hopsTravelled } from '@/lib/mesh';
import type { MeshMessage } from '@/types/models';

const message = (overrides: Partial<MeshMessage> = {}): MeshMessage => ({
  id: 'sos-123',
  emergencyType: 'medical',
  position: { latitude: 12.6392, longitude: -8.0029 },
  createdAt: 1_700_000_000_000,
  hopsRemaining: 6,
  initialTtl: 6,
  severity: 'critique',
  originHash: 'a1b2c3d4',
  originPublicKey: 'A'.repeat(120),
  originSignature: 'B'.repeat(96),
  ...overrides,
});

describe('mesh relay decisions', () => {
  it('rejects a message already seen without changing it', () => {
    const packet = message();
    expect(decideRelay(packet, new Set(['sos-123']), packet.createdAt)).toEqual({ relay: false, reason: 'duplicate' });
    expect(packet.hopsRemaining).toBe(6);
  });

  it('decrements the TTL exactly once for a new relay', () => {
    const packet = message({ hopsRemaining: 3 });
    const result = decideRelay(packet, new Set(), packet.createdAt);
    expect(result.relay).toBe(true);
    if (result.relay) {
      expect(result.packet.hopsRemaining).toBe(2);
      expect(hopsTravelled(result.packet)).toBe(4);
    }
  });

  it('never relays a packet whose TTL is exhausted', () => {
    const packet = message({ hopsRemaining: 0 });
    expect(decideRelay(packet, new Set(), packet.createdAt)).toEqual({
      relay: false,
      reason: 'ttl-expired',
    });
  });

  it('rejette une alerte âgée de plus de 30 minutes', () => {
    const packet = message();
    expect(decideRelay(packet, new Set(), packet.createdAt + 30 * 60 * 1000 + 1)).toEqual({ relay: false, reason: 'expired' });
  });

  it('rejette une alerte datée trop loin dans le futur', () => {
    const packet = message();
    expect(decideRelay(packet, new Set(), packet.createdAt - 5 * 60 * 1000 - 1)).toEqual({ relay: false, reason: 'invalid-time' });
  });
});

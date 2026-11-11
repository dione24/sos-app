import { describe, expect, it } from 'vitest';
import { canonicalOriginPayload, meshOriginPosition } from '../mesh-origin-payload';
import { decodeMeshWirePacket, encodeMeshWirePacket } from '../mesh-wire';
import type { MeshMessage } from '@/types/models';

const packet: MeshMessage = {
  id: '11111111-1111-4111-8111-111111111111', emergencyType: 'medical',
  position: { latitude: 12.6, longitude: -8, accuracy: 25, timestamp: 1_800_000_000_000 },
  createdAt: 1_800_000_000_000, hopsRemaining: 6, initialTtl: 6, severity: 'critique',
  originHash: 'a'.repeat(16), originPublicKey: 'b'.repeat(120), originSignature: 'c'.repeat(96),
};

describe('mesh signed position excludes local fix metadata', () => {
  it('preserves the legacy canonical field order and excludes timestamps', () => {
    const normalized = meshOriginPosition(packet.position);
    expect(Object.keys(normalized!)).toEqual(['latitude', 'longitude', 'accuracy']);
    expect(canonicalOriginPayload(packet)).toBe(JSON.stringify({
      version: 1, id: packet.id, emergencyType: packet.emergencyType,
      position: { latitude: 12.6, longitude: -8, accuracy: 25 },
      createdAt: packet.createdAt, initialTtl: packet.initialTtl, severity: packet.severity,
    }));
  });

  it.each([packet.position, { latitude: 12.6, longitude: -8, timestamp: 1_800_000_000_000 }, null])('keeps the signed payload identical after a wire roundtrip', (position) => {
    const message = { ...packet, position };
    const decoded = decodeMeshWirePacket(encodeMeshWirePacket(message));
    expect(decoded).not.toBeNull();
    expect(canonicalOriginPayload(decoded!)).toBe(canonicalOriginPayload(message));
    if (position) expect(decoded!.position).not.toHaveProperty('timestamp');
    else expect(decoded!.position).toBeNull();
  });
});

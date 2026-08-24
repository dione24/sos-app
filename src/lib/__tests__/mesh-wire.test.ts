import { describe, expect, it } from 'vitest';

import { decodeMeshWirePacket, encodeMeshWirePacket } from '@/lib/mesh-wire';
import type { MeshMessage } from '@/types/models';

const packet: MeshMessage = {
  id: '550e8400-e29b-41d4-a716-446655440000',
  emergencyType: 'medical',
  position: { latitude: 12.6392, longitude: -8.0029, accuracy: 8 },
  createdAt: 1_786_333_200_000,
  hopsRemaining: 6,
  initialTtl: 6,
  severity: 'critique',
  originHash: '0123456789abcdef',
  originPublicKey: 'A'.repeat(124),
  originSignature: 'B'.repeat(96),
};

describe('format BLE compact et signé', () => {
  it('reste sous la limite GATT de 480 octets', () => {
    expect(new TextEncoder().encode(encodeMeshWirePacket(packet)).byteLength).toBeLessThanOrEqual(480);
  });

  it('conserve tous les champs vitaux après encodage', () => {
    expect(decodeMeshWirePacket(encodeMeshWirePacket(packet))).toEqual(packet);
  });

  it('rejette un paquet incomplet ou un champ injecté', () => {
    expect(decodeMeshWirePacket('{"v":1}')).toBeNull();
    const injected = JSON.stringify({ ...JSON.parse(encodeMeshWirePacket(packet)), medical: 'secret' });
    expect(decodeMeshWirePacket(injected)).toBeNull();
  });
});

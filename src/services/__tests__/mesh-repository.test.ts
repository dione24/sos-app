import { describe, expect, it, vi } from 'vitest';

vi.mock('expo-crypto', () => ({
  randomUUID: vi.fn(() => 'generated-id'),
}));

vi.mock('@/services/mesh-integrity', () => ({
  signMeshOrigin: vi.fn(),
  verifyMeshOrigin: vi.fn(async () => true),
}));

import { markMessageRelayed, processIncomingMessage } from '../mesh-repository';
import type { MeshMessage } from '@/types/models';

const incoming: MeshMessage = {
  id: 'sos-incoming-1',
  emergencyType: 'medical',
  position: null,
  createdAt: Date.now(),
  hopsRemaining: 2,
  initialTtl: 3,
  severity: 'critique',
  originHash: 'origin-1',
  originPublicKey: 'public-key',
  originSignature: 'signature',
};

describe('mesh repository relay state', () => {
  it('stores an eligible packet as received until BLE advertising is confirmed', async () => {
    const calls: Array<{ sql: string; args: unknown[] }> = [];
    const runAsync = vi.fn(async (sql: string, ...args: unknown[]) => { calls.push({ sql, args }); });
    const getFirstAsync = vi.fn()
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(null);
    const withTransactionAsync = vi.fn(async (operation: () => Promise<void>) => operation());
    const db = { runAsync, getFirstAsync, withTransactionAsync } as never;

    const decision = await processIncomingMessage(db, incoming);

    expect(decision.relay).toBe(true);
    const historyInsert = calls.find(({ sql }) => sql.includes('INSERT INTO sos_history'));
    expect(historyInsert?.args[1]).toBe('received');
    expect(calls.some(({ args }) => args.includes('relayed'))).toBe(false);
  });

  it('marks the saved packet as relayed only after transport confirmation', async () => {
    const runAsync = vi.fn().mockResolvedValue(undefined);
    const db = { runAsync } as never;

    await markMessageRelayed(db, { ...incoming, hopsRemaining: 1 });

    expect(runAsync).toHaveBeenCalledOnce();
    expect(runAsync.mock.calls[0]?.[0]).toContain("SET direction = 'relayed'");
    expect(runAsync.mock.calls[0]?.[3]).toBe(incoming.id);
  });
});

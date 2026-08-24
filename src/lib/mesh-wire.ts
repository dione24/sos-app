import { z } from 'zod';

import { parseMeshMessage } from '@/lib/mesh';
import type { MeshMessage } from '@/types/models';

const WirePacketSchema = z.object({
  v: z.literal(1),
  i: z.uuid(),
  t: z.enum(['medical', 'accident', 'agression', 'incendie', 'noyade', 'autre']),
  p: z.tuple([z.number(), z.number(), z.number().optional()]).nullable(),
  c: z.number().int().positive(),
  h: z.number().int(),
  n: z.number().int(),
  s: z.enum(['faible', 'moyen', 'eleve', 'critique']),
  o: z.string(),
  k: z.string(),
  g: z.string(),
}).strict();

export function encodeMeshWirePacket(message: MeshMessage) {
  return JSON.stringify({
    v: 1,
    i: message.id,
    t: message.emergencyType,
    p: message.position
      ? message.position.accuracy === undefined
        ? [message.position.latitude, message.position.longitude]
        : [message.position.latitude, message.position.longitude, message.position.accuracy]
      : null,
    c: message.createdAt,
    h: message.hopsRemaining,
    n: message.initialTtl,
    s: message.severity,
    o: message.originHash,
    k: message.originPublicKey,
    g: message.originSignature,
  });
}

export function decodeMeshWirePacket(value: string): MeshMessage | null {
  try {
    const result = WirePacketSchema.safeParse(JSON.parse(value));
    if (!result.success) return null;
    const wire = result.data;
    const position = wire.p
      ? {
          latitude: wire.p[0],
          longitude: wire.p[1],
          ...(wire.p[2] === undefined ? {} : { accuracy: wire.p[2] }),
        }
      : null;
    return parseMeshMessage({
      id: wire.i,
      emergencyType: wire.t,
      position,
      createdAt: wire.c,
      hopsRemaining: wire.h,
      initialTtl: wire.n,
      severity: wire.s,
      originHash: wire.o,
      originPublicKey: wire.k,
      originSignature: wire.g,
    });
  } catch {
    return null;
  }
}

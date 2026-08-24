import type { MeshMessage } from '@/types/models';
import { z } from 'zod';

export const MESH_DEFAULT_TTL = 6;
export const SEEN_MESSAGE_MAX_AGE_MS = 24 * 60 * 60 * 1000;
export const MESH_MESSAGE_MAX_AGE_MS = 30 * 60 * 1000;
export const MESH_MAX_FUTURE_SKEW_MS = 5 * 60 * 1000;
export const MESH_ORIGIN_RATE_WINDOW_MS = 10 * 60 * 1000;
export const MESH_ORIGIN_RATE_MAX = 3;

const MeshMessageSchema = z.object({
  id: z.uuid(),
  emergencyType: z.enum(['medical', 'accident', 'agression', 'incendie', 'noyade', 'autre']),
  position: z.object({
    latitude: z.number().min(-90).max(90),
    longitude: z.number().min(-180).max(180),
    accuracy: z.number().nonnegative().max(100_000).optional(),
  }).strict().nullable(),
  createdAt: z.number().int().positive(),
  hopsRemaining: z.number().int().min(0).max(MESH_DEFAULT_TTL),
  initialTtl: z.number().int().min(1).max(MESH_DEFAULT_TTL),
  severity: z.enum(['faible', 'moyen', 'eleve', 'critique']),
  medicalSummary: z.string().max(120).optional(),
  originHash: z.string().min(8).max(64),
  originPublicKey: z.string().min(80).max(256),
  originSignature: z.string().min(64).max(256),
}).strict();

export function parseMeshMessage(value: unknown): MeshMessage | null {
  const result = MeshMessageSchema.safeParse(value);
  if (!result.success) return null;
  const message = result.data;
  const position = message.position
    ? {
        latitude: message.position.latitude,
        longitude: message.position.longitude,
        ...(message.position.accuracy === undefined ? {} : { accuracy: message.position.accuracy }),
      }
    : null;
  return {
    id: message.id,
    emergencyType: message.emergencyType,
    position,
    createdAt: message.createdAt,
    hopsRemaining: message.hopsRemaining,
    initialTtl: message.initialTtl,
    severity: message.severity,
    originHash: message.originHash,
    originPublicKey: message.originPublicKey,
    originSignature: message.originSignature,
    ...(message.medicalSummary === undefined ? {} : { medicalSummary: message.medicalSummary }),
  };
}

export type RelayDecision =
  | { relay: true; packet: MeshMessage }
  | { relay: false; reason: 'duplicate' | 'ttl-expired' | 'expired' | 'invalid-time' | 'rate-limited' | 'invalid-signature' };

/**
 * Pure relay decision used by both the BLE transport and tests. The id is stored
 * before any retransmission so concurrent scans cannot create a relay loop.
 */
export function decideRelay(message: MeshMessage, seenIds: ReadonlySet<string>, now = Date.now()): RelayDecision {
  if (seenIds.has(message.id)) return { relay: false, reason: 'duplicate' };
  if (message.createdAt > now + MESH_MAX_FUTURE_SKEW_MS) return { relay: false, reason: 'invalid-time' };
  if (now - message.createdAt > MESH_MESSAGE_MAX_AGE_MS) return { relay: false, reason: 'expired' };
  if (message.hopsRemaining <= 0) return { relay: false, reason: 'ttl-expired' };
  return {
    relay: true,
    packet: { ...message, hopsRemaining: message.hopsRemaining - 1 },
  };
}

export function hopsTravelled(message: MeshMessage) {
  return Math.max(0, message.initialTtl - message.hopsRemaining);
}

export function purgeBeforeTimestamp(now = Date.now()) {
  return now - SEEN_MESSAGE_MAX_AGE_MS;
}

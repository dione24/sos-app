import type { Coordinates, MeshMessage } from '@/types/models';

/** Runtime fix timestamps stay local and must not enter the signed wire body. */
export function meshOriginPosition(position: Coordinates | null) {
  return position ? {
    latitude: position.latitude,
    longitude: position.longitude,
    ...(position.accuracy === undefined ? {} : { accuracy: position.accuracy }),
  } : null;
}

export function canonicalOriginPayload(message: Omit<MeshMessage, 'originHash' | 'originPublicKey' | 'originSignature'> | MeshMessage) {
  return JSON.stringify({
    version: 1,
    id: message.id,
    emergencyType: message.emergencyType,
    position: meshOriginPosition(message.position),
    createdAt: message.createdAt,
    initialTtl: message.initialTtl,
    severity: message.severity,
  });
}

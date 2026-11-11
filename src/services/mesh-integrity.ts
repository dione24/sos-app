import * as Crypto from 'expo-crypto';

import ExpoBleAdvertiser from '../../modules/expo-ble-advertiser/src/ExpoBleAdvertiserModule';
import type { MeshMessage } from '@/types/models';
import { canonicalOriginPayload } from '@/lib/mesh-origin-payload';
export { canonicalOriginPayload } from '@/lib/mesh-origin-payload';

export async function signMeshOrigin(
  message: Omit<MeshMessage, 'originHash' | 'originPublicKey' | 'originSignature'>,
): Promise<MeshMessage> {
  const signed = await ExpoBleAdvertiser.signPayloadAsync(canonicalOriginPayload(message));
  const originHash = (await Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, signed.publicKey)).slice(0, 16);
  return {
    ...message,
    originHash,
    originPublicKey: signed.publicKey,
    originSignature: signed.signature,
  };
}

export async function verifyMeshOrigin(message: MeshMessage) {
  const expectedHash = (await Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, message.originPublicKey)).slice(0, 16);
  if (expectedHash !== message.originHash) return false;
  return ExpoBleAdvertiser.verifyPayloadAsync(
    canonicalOriginPayload(message),
    message.originPublicKey,
    message.originSignature,
  );
}

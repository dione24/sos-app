/** Shim web d'`expo-secure-store` (captures uniquement) : localStorage, non chiffré. */
export const WHEN_UNLOCKED_THIS_DEVICE_ONLY = 'WHEN_UNLOCKED_THIS_DEVICE_ONLY';

export async function getItemAsync(key: string) {
  try {
    return globalThis.localStorage?.getItem(`secure:${key}`) ?? null;
  } catch {
    return null;
  }
}

export async function setItemAsync(key: string, value: string, _options?: unknown) {
  try {
    globalThis.localStorage?.setItem(`secure:${key}`, value);
  } catch {
    // Stockage indisponible : la clé reste en mémoire pour la session.
  }
}

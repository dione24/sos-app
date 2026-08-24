export function friendlyBleScanError(message: string) {
  const normalized = message.toLowerCase();
  if (
    normalized.includes('cannot start scanning operation') ||
    normalized.includes('scan start') ||
    normalized.includes('timeoutexception')
  ) {
    return 'Le service Bluetooth de ce téléphone ne répond pas. Redémarrez le téléphone puis réessayez.';
  }
  return `Scan Bluetooth impossible : ${message}`;
}

export function friendlyBleAdvertisingError(message: string) {
  const normalized = message.toLowerCase();
  if (
    normalized.includes("impossible d'ouvrir le serveur gatt") ||
    normalized.includes('err_gatt_server') ||
    normalized.includes('timeoutexception') ||
    normalized.includes('délai de démarrage bluetooth') ||
    normalized.includes('démarrage de la diffusion bluetooth a expiré')
  ) {
    return 'Le service Bluetooth de ce téléphone ne répond pas. Redémarrez le téléphone puis réessayez.';
  }

  // Expo wraps native rejections with implementation details that are not useful
  // to a person handling an emergency. Preserve the native French cause only.
  const nativeCause = message.match(/(?:→\s*)?Caused by:\s*(.+)$/is)?.[1]?.trim();
  if (nativeCause) return nativeCause.replace(/\.{2,}$/u, '.');
  if (normalized.includes("call to function 'expobleadvertiser")) {
    return 'Diffusion Bluetooth impossible. Réessayez ou utilisez l’appel et le SMS.';
  }
  return message;
}

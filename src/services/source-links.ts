import { Alert, Linking } from 'react-native';

/** Les références documentaires ouvrent uniquement des pages HTTPS publiques. */
export function isSafeSourceUrl(value: string) {
  try {
    const url = new URL(value);
    return url.protocol === 'https:' && Boolean(url.hostname) && !url.username && !url.password;
  } catch {
    return false;
  }
}

export async function openSourceUrl(url: string) {
  if (!isSafeSourceUrl(url)) {
    Alert.alert('Source indisponible', 'Ce lien ne peut pas être ouvert.');
    return false;
  }

  try {
    await Linking.openURL(url);
    return true;
  } catch {
    Alert.alert('Source indisponible', "Impossible d'ouvrir la page. Vérifiez votre connexion puis réessayez.");
    return false;
  }
}

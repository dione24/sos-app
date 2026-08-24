import { Alert, Linking } from 'react-native';

export async function openPhoneDialer(number: string) {
  const dialNumber = number.replace(/[^+\d]/g, '');
  if (!dialNumber) {
    Alert.alert('Numéro invalide', 'Impossible de composer ce numéro.');
    return false;
  }

  const url = `tel:${dialNumber}`;
  try {
    await Linking.openURL(url);
    return true;
  } catch {
    Alert.alert(
      'Appel impossible',
      `Impossible d'ouvrir le téléphone. Composez manuellement le ${number}.`,
    );
    return false;
  }
}

export function confirmCall(number: string, service: string) {
  const dialNumber = number.replace(/[^+\d]/g, '');
  if (!dialNumber) {
    Alert.alert('Numéro invalide', 'Impossible de composer ce numéro.');
    return;
  }

  Alert.alert(
    `Appeler le ${number} ?`,
    `${service} — l'appel utilisera le réseau téléphonique de l'appareil.`,
    [
      { text: 'Annuler', style: 'cancel' },
      {
        text: 'Appeler',
        style: 'default',
        onPress: () => void openPhoneDialer(number),
      },
    ],
  );
}

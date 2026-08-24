# SOS Sécurité Mali

Application mobile Expo (**Android + iOS**), hors-ligne d'abord, dédiée aux
premiers secours et à l'alerte d'urgence au Mali.

**Éditeur :** SahelPay Technologies · **Développeur :** Abdoulaye NIANGALY  
**Site :** https://sahelpay.ml · **Support :** support@sahelpay.ml  
**Prix :** gratuite · sans publicité · sans compte  

Aucun backend médical : le dossier, les contacts et l'historique restent dans une
base SQLCipher sur le téléphone.

Identifiants store : `ml.sossecurite.app`  
Politique : https://sahelpay.ml/apps/sos-securite-mali/privacy  
(fichier source : `store-assets/privacy-policy.html`)

## État du projet

La V1 comprend :

- accueil avec SOS immédiatement accessible ;
- sélection du type d'urgence, GPS, appel confirmé et SMS natif prérempli ;
- dossier médical local, deux contacts, partage QR et fichier JSON ;
- dix guides de premiers secours embarqués, lecture vocale française ;
- métronome RCP à 110 BPM avec son, vibration et correction de dérive ;
- annuaire statique des numéros d'urgence du Mali ;
- carte MapLibre via un fournisseur MapTiler de production et liste locale de lieux,
  avec fallback honnête si aucune clé n'est configurée ;
- météo Open-Meteo avec cache SQLite et âge de la donnée visible ;
- paquet SOS structuré, TTL, historique et dédoublonnage du relais BLE ;
- signature P-256 des paquets d'origine via Android Keystore et notification
  persistante pendant la diffusion ;
- bilinguisme **français + bamanankan** : textes embarqués (pas de TTS système) ;
  audio voix humaine à brancher fichier par fichier ;
- opt-in « secouriste disponible ».

## Important : ce projet ne fonctionne pas dans Expo Go

`react-native-ble-plx` et MapLibre contiennent du code natif. Il faut un **development
build** ou une build EAS. Expo Go ne peut pas charger ces modules.

### Premier lancement Android local

Prérequis : Node.js 22.13+ (SDK 57), Android Studio/SDK et un téléphone avec le
débogage USB activé.

```bash
npm install
npx expo prebuild --platform android
npx expo run:android --device
```

### Premier lancement iOS local

Prérequis : macOS, Xcode, Apple Developer pour device physique.

```bash
npm install
npx expo prebuild --platform ios
npx expo run:ios --device
```

> Le relais BLE multi-hop est plus contraint sur iOS que sur Android. L’app reste
> utilisable pour SOS (appel/SMS), guides, RCP et dossier local.

Dans un second terminal :

```bash
npm start
```

Quand le téléphone Android est branché, `adb devices` doit l'afficher avec l'état `device`.
Accepter la clé RSA sur le téléphone si Android la demande.

### Publication

Voir `docs/PUBLISHER.md`, `docs/PRODUCTION_BUILD.md`, `docs/PLAY_CONSOLE_SUBMISSION.md`
et `docs/APP_STORE_SUBMISSION.md`.

### EAS Build

```bash
npm install -g eas-cli
eas login
eas build --profile development --platform android
```

Le profil `development` produit un APK interne avec `expo-dev-client`. `preview`
produit également un APK et `production` un Android App Bundle.

## Permissions

- **Localisation précise** : ajout des coordonnées à un SOS et tri des lieux.
- **Bluetooth Scan/Connect** : détection des relais BLE (Android 12+).
- **Notifications** : signalement visible du relais actif et action d'arrêt.
- **Bluetooth / localisation** : compatibilité Android 11 et antérieur.
- **Vibration** : rythme du métronome RCP.
- **Photos** : photo facultative du dossier, seulement après action utilisateur.
- **SMS** : `expo-sms` ouvre l'application SMS native ; l'utilisateur confirme
  toujours l'envoi. Aucun SMS silencieux n'est possible ni tenté.

L'ouverture de `tel:` affiche aussi une confirmation dans l'application avant de
passer à l'application Téléphone.

## Limites techniques connues

### Bambara

Le bambara médical est masqué dans la V1. Le moteur TTS du système ne propose
généralement pas cette langue ; les futurs fichiers enregistrés et validés devront
être ajoutés sous :

```text
assets/audio/bambara/{guideId}/{stepId}.mp3
```

Les placeholders sont documentés dans
`assets/audio/bambara/README.md`. La langue ne devra être réactivée dans
l'interface qu'après validation des traductions et enregistrements par un locuteur
bambara et un professionnel de santé.

### Relais BLE multi-hop

La logique critique est implémentée et testée : paquet structuré, UUID, gravité,
TTL, décrémentation, stockage des identifiants vus, purge et historique. Le scan
BLE basse consommation est assuré par `react-native-ble-plx`.

Comme `react-native-ble-plx` ne fournit pas le rôle périphérique entre téléphones,
le projet inclut désormais le module Kotlin local
`modules/expo-ble-advertiser`. Il publie un service BLE connectable et sert le
paquet complet dans une caractéristique GATT. Un voisin le lit, le déduplique,
décrémente son TTL, le sauvegarde et le rediffuse. Les paquets sont limités à
480 octets. Le relais n'embarque aucune donnée médicale, les paquets d'origine
sont signés par une clé P-256 non exportable dans Android Keystore, et les
relectures/paquets expirés sont rejetés.

Avant d'annoncer un « multi-hop réel » en production, il faut :

1. tester trois téléphones physiques et vérifier au moins trois sauts ;
2. mesurer la portée en intérieur/extérieur et l'impact batterie ;
3. mesurer la résistance aux interférences et aux fabricants Android agressifs ;
4. valider les restrictions de tâche de fond sur chaque version Android ciblée.

iOS limite encore davantage l'advertising et l'exécution BLE en arrière-plan.
La diffusion Android s'appuie sur un service de premier plan visible, avec une
notification d'arrêt et une expiration automatique après 30 minutes. L'interface
affiche le mode dégradé et l'historique local quand le relais n'est pas actif. Le « pont SMS »
exige une confirmation utilisateur, conformément aux règles Android/iOS.

### Carte hors ligne

La liste de lieux est embarquée et fonctionne immédiatement. La carte vectorielle
utilise MapLibre 11 et exige une clé MapTiler restreinte, injectée dans
`EXPO_PUBLIC_MAPTILER_KEY` au build. Sans clé, l'application reste en liste locale,
jamais sur un écran vide ni sur des tuiles de démonstration.

Le jeu initial de points vient d'OpenStreetMap (extraction du 10 août 2026, ODbL).
Les horaires et numéros locaux doivent être vérifiés par une équipe éditoriale
avant publication publique.

### Météo

Open-Meteo est interrogé seulement lorsque le réseau est joignable. L'accueil
utilise Bamako ; la position précise n'est transmise qu'après le consentement météo
séparé. En cas d'échec, le dernier instantané SQLite est affiché avec son âge. Une
valeur de fallback est explicitement marquée comme indisponible et n'est jamais
présentée comme temps réel.

## Données et confidentialité

Tables SQLite :

- `user_profile`
- `emergency_contacts`
- `app_settings`
- `rescuer_opt_in`
- `mesh_seen_messages`
- `sos_history`

Le numéro de téléphone est une clé locale. Il n'est pas vérifié, envoyé à un
serveur ou utilisé pour se connecter. Un export QR/JSON contient des données
sensibles et n'est créé qu'après une action explicite.

La clé SQLCipher aléatoire de 256 bits est conservée par SecureStore. La suppression
intégrée active `secure_delete`, efface les tables et préférences, tronque le journal
WAL puis compacte la base avec `VACUUM` avant de revenir au premier démarrage.

## Vérifications

```bash
npm run typecheck
npm test
npx expo install --check
npx expo-doctor
```

Les tests couvrent notamment le dédoublonnage mesh, l'expiration/décrémentation du
TTL, les signatures, les coordonnées brutes, le rythme RCP sur cinq minutes,
l'import/export médical V2 et la validation des données embarquées.

## Références de sécurité médicale

Le contenu français est un socle éditorial et doit encore être validé par la DGPC
et des professionnels maliens avant diffusion publique. Sources de référence :

- [IFRC — International First Aid, Resuscitation and Education Guidelines 2025](https://www.ifrc.org/document/ifrc-international-first-aid-resuscitation-and-education-guidelines-2025)
- [European Resuscitation Council — Guidelines 2025](https://www.erc.edu/science-research/guidelines/guidelines-2025/guidelines-2025-english)
- [OMS — morsures de serpent](https://www.who.int/health-topics/snakebite/snakebite)
- [OMS — noyade](https://www.who.int/news-room/fact-sheets/detail/drowning)

## Versions

Le projet cible Expo SDK 57, React Native 0.86 et React 19.2. Les paquets Expo ont
été installés avec `npx expo install`, qui sélectionne les versions compatibles du
SDK. Les modules communautaires ont été vérifiés sur leurs publications actuelles :
`react-native-ble-plx` 3.5.1 et MapLibre React Native 11.3.6.

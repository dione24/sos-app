# Déclaration Google Play — service au premier plan

À reporter dans **Règles > Contenu de l'application > Autorisations de service au
premier plan** pour l'AAB qui cible Android API 36.

## Type déclaré

- Permission : `FOREGROUND_SERVICE_CONNECTED_DEVICE`.
- Type : **Connected device — continuous data transfer to an external device**.
- Service : `expo.modules.bleadvertiser.BleRelayForegroundService`.
- Le service n'est pas exporté et ne démarre qu'après une action de l'utilisateur.

## Description à copier

> Lorsqu'un utilisateur choisit « Diffuser par relais Bluetooth » pour une alerte
> SOS, l'application ouvre temporairement un serveur Bluetooth GATT et annonce
> l'alerte aux téléphones SOS compatibles à proximité. Le transfert contient le type
> d'urgence, l'heure, un identifiant anonyme et, si l'utilisateur l'a autorisée, sa
> position. Aucune donnée du dossier médical n'est diffusée. Une notification
> persistante indique que le relais est actif, propose une action d'arrêt et la
> diffusion expire automatiquement au plus tard après 30 minutes.

## Impact d'un démarrage différé

> Les téléphones proches ne reçoivent pas immédiatement l'alerte Bluetooth. L'appel
> téléphonique et le SMS restent disponibles et doivent être privilégiés. L'interface
> indique que l'alerte est seulement enregistrée localement si le relais ne démarre
> pas.

## Impact d'une interruption

> La diffusion et le serveur GATT s'arrêtent ; les nouveaux téléphones proches ne
> peuvent plus récupérer cette alerte. L'alerte locale, l'appel, le SMS et les guides
> restent disponibles. L'utilisateur peut rouvrir l'écran Relais et réessayer tant
> que l'alerte n'a pas expiré.

## Vidéo obligatoire

Google demande un lien vidéo pour chaque type de service au premier plan. Publier
la vidéo comme **YouTube non répertoriée** ou comme MP4 Google Drive accessible sans
connexion. Le parcours doit montrer :

1. ouverture complète de l'application ;
2. onglet Relais, divulgation Bluetooth entièrement lisible, puis « Pas maintenant » ;
3. retour dans Relais pour prouver que le choix reste disponible ;
4. création d'un SOS de démonstration sans donnée personnelle ;
5. « Diffuser par relais Bluetooth », divulgation puis « Autoriser et diffuser » ;
6. permissions Android ;
7. notification persistante « Relais SOS actif » et son action d'arrêt ;
8. retour dans l'application et arrêt de la diffusion.

Le service doit réellement démarrer dans la vidéo. Le TECNO KL5 actuel renvoie un
timeout GATT HiOS et l'émulateur Android déclare l'annonce BLE non prise en charge :
enregistrer ce parcours sur un autre téléphone compatible avant la soumission. Le
script `scripts/record-play-fgs-demo.sh` prépare l'enregistrement ADB et récupère le
MP4. `npm run verify:fgs-video` contrôle ensuite le conteneur, la piste vidéo, la
durée (10 à 180 secondes) et une résolution minimale de 480 × 800.

Références officielles vérifiées le 10 août 2026 :

- déclaration des types FGS et vidéo du parcours utilisateur :
  https://support.google.com/googleplay/android-developer/answer/13392821
- critères FGS (fonction cœur, perceptible, arrêtable et durée minimale nécessaire) :
  https://support.google.com/googleplay/android-developer/answer/16559646

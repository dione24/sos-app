# Déclaration Google Play — service au premier plan

À reporter dans **Règles > Contenu de l'application > Autorisations de service au
premier plan** pour l'AAB qui cible Android API 36.

## Type déclaré

- Permission : `FOREGROUND_SERVICE_CONNECTED_DEVICE`.
- Type : **Connected device — continuous data transfer to an external device**.
- Service : `expo.modules.bleadvertiser.BleRelayForegroundService`.
- Le service n'est pas exporté et ne démarre qu'après une action de l'utilisateur.

## Description à copier

> Lorsqu'un utilisateur choisit « Alerter autour de moi » pour une alerte
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
5. « Alerter autour de moi », divulgation puis « Autoriser et alerter » ;
6. permissions Android ;
7. notification persistante « Alerte SOS diffusée » et son action d'arrêt ;
8. retour dans l'application et arrêt de la diffusion.

Le service doit réellement démarrer dans la vidéo. Le 6 novembre 2026, le
TECNO KN4 (Android 16) a effectivement démarré le serveur GATT, l’annonce et
`BleRelayForegroundService` (`isForeground=true`, type `connectedDevice`,
notification permanente ID 122 avec une action d’arrêt). Le TECNO KL5 mentionné
historiquement renvoyait un timeout GATT ; ce résultat ne vaut pas pour le KN4.

La nouvelle interface ouvre le relais depuis le SOS : « Alerter autour de moi »,
divulgation lisible, refus possible, puis « Autoriser et alerter ». Après diffusion,
choisir « Alertes proches ». L’arrêt doit être vérifié depuis la notification
**et** depuis « Arrêter de partager mon alerte » dans l’application. Le retour dans
cet écran et la pause de la recherche ne doivent pas redémarrer une alerte arrêtée.
L’état de diffusion est synchronisé avec le module natif, y compris après un arrêt
par notification ou expiration ; l’historique seul ne déclenche plus une nouvelle
annonce sans action explicite.

Le script `scripts/record-play-fgs-demo.sh` prépare l’enregistrement ADB et récupère
le MP4. `npm run verify:fgs-video` contrôle le conteneur, la piste vidéo, la durée
(10 à 180 secondes) et une résolution minimale de 480 × 800. Une vidéo HTTP(S)
accessible sans connexion peut être fournie ; le guide Google exige un lien et
la démonstration de la fonctionnalité, sans imposer un hébergeur particulier.
## Preuve finale du 6 novembre 2026

`store-assets/video/foreground-service-connected-device.mp4` : vidéo native de
l’APK EAS preview **code 5** sur TECNO KN4, Android 16. Deux séquences réelles
assemblées, avec bandeau explicatif et masquage des notifications des autres apps ;
les pixels de l’interface SOS ne sont pas recréés. SOS fictif de type « Autre »,
sans position, aucun appel/SMS envoyé et aucun dossier médical réel.

Le démarrage GATT / FGS est confirmé en natif. Les arrêts depuis l’app et depuis
la notification réussissent. Après retour dans l’app, l’état est synchronisé ;
pause et nouvelle demande de recherche ne relancent pas la diffusion antérieure.
La vidéo valide le contrôle MP4 : **107,3 s, 720 × 1666, 1,9 Mio**.

Lien public vérifié sans compte :
https://www.sahelpay.ml/apps/sos-securite-mali/foreground-service-connected-device.mp4

La déclaration est enregistrée dans Google Play : « Transfert de données continu
vers un appareil externe », avec ce lien. Le formulaire est apparu **après** le
premier déploiement de la piste interne. Il n’était pas disponible avant ce déploiement.
Les changements de contenu restent distincts de la release interne non examinée.
Une seule unité ne valide pas le transfert multi-appareils ni trois sauts ; aucune
garantie multi-hop n’est ajoutée à la fiche.

Références officielles consultées le 6 novembre 2026 :

- déclaration des types FGS et vidéo du parcours utilisateur :
  https://support.google.com/googleplay/android-developer/answer/13392821
- critères FGS (fonction cœur, perceptible, arrêtable et durée minimale nécessaire) :
  https://support.google.com/googleplay/android-developer/answer/16559646

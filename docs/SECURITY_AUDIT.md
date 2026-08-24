# Audit sécurité V1 — 10 août 2026

## Binaire Android vérifié

- cible API 36, minimum API 24 ;
- sauvegarde Android désactivée (`allowBackup=false`) ;
- base locale SQLCipher et secret conservé via Android Keystore / SecureStore ;
- suppression locale renforcée par `secure_delete`, checkpoint WAL et `VACUUM` ;
- service BLE déclaré `exported=false` et limité au type foreground
  `connectedDevice` ;
- permissions `SYSTEM_ALERT_WINDOW` et `RECEIVE_BOOT_COMPLETED` absentes de
  l'APK final ;
- permissions globales `READ_EXTERNAL_STORAGE`, `WRITE_EXTERNAL_STORAGE` et
  `READ_MEDIA_IMAGES` absentes ; la photo facultative utilise le sélecteur système ;
- permissions biométriques absentes : la V1 ne demande jamais d'authentification
  biométrique et protège la clé SQLCipher avec Android Keystore/SecureStore ;
- Bluetooth classique et BLE facultatifs dans le catalogue Play, sans exclure
  les téléphones qui n'ont pas de relais compatible ;
- permissions Bluetooth historiques limitées à Android 11 et inférieur ; sur
  Android 12+, le scan déclare explicitement qu'il ne sert pas à déterminer la
  position de l'utilisateur (`neverForLocation`) ;
- matériel de localisation facultatif dans le catalogue Play, puisque l'alerte
  reste utilisable sans coordonnées GPS ;
- position limitée au premier plan et demandée seulement après l'action
  « Utiliser ma position » ; aucun accès en arrière-plan ;
- notifications demandées après l'autorisation des appareils proches et jamais
  bloquantes pour l'appel ou le SMS ;
- aucune permission d'appel, SMS silencieux, contacts ou microphone ;
- aucune dépendance Firebase, Crashlytics, publicité ou tracker identifiée dans
  le manifeste et les artefacts du bundle ;
- APK release installé et lancé sur TECNO KL5 sans interface de développement.

L'APK et l'AAB locaux utilisent encore le certificat Android Debug. Ils servent
uniquement aux essais. Le bundle destiné à Google Play doit être produit avec la
clé de publication et testé sur la piste interne.

## Dépendances JavaScript

`expo install --check` indique que toutes les versions sont compatibles avec Expo
SDK 57 et Expo Doctor réussit 20 contrôles sur 20.

`npm audit --omit=dev` remonte 24 avis transitifs (9 modérés, 15 élevés, aucun
critique). Les deux causes racines observées sont `image-size@1.2.1`, utilisé par
Metro pendant le bundling, et `uuid@7.0.3`, utilisé par l'outil de configuration
iOS `xcode`. Ces outils ne sont pas embarqués comme code JavaScript exécutable de
l'application Android distribuée.

Ne pas lancer `npm audit fix --force` : npm propose une rétrogradation majeure et
incompatible d'Expo / React Native. Suivre la résolution via les mises à jour Expo
SDK, Metro et `@expo/config-plugins`, puis relancer l'audit avant publication.

## Éditeur

SahelPay Technologies · Abdoulaye NIANGALY · support@sahelpay.ml · app gratuite.

## Risques restant à fermer

- AAB / IPA signés de production et tests piste interne / TestFlight ;
- validation BLE sur au moins trois modèles réels (Android) + limites iOS documentées ;
- validation clinique locale du contenu de premiers secours ;
- clé MapTiler restreinte aux packages Android et iOS `ml.sossecurite.app` ;
- mise en ligne de `privacy-policy.html` sur https://sahelpay.ml/apps/sos-securite-mali/privacy ;
- saisie des déclarations Play et App Store Connect.

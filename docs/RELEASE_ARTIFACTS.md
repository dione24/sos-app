# Artefacts Android — 6 novembre 2026

## Passage en production — 6 novembre 2026

Le propriétaire a expressément demandé le passage en production et la fusion de la
PR après le test interne. La version **1.0.0 (5)**, identique au bundle testé, a été
ajoutée au canal de production `4697930975691391093`, pour **le Mali**.
Les dix modifications (release, pays, fiche française et déclarations) ont été
envoyées : Play affiche « Modifications en cours d’examen », avec les vérifications
automatiques préalables encore en cours. La publication gérée est désactivée : le
déploiement complet est prévu après approbation Google. Cette soumission ne signifie
pas que l’app est déjà disponible publiquement.

La relecture médicale locale reste **non documentée**, et les limites de QA restent
celles de `QA_MATRIX.md`. Aucune signature clinique ni réussite de test non exécuté
n’est ajoutée. La demande actuelle remplace la consigne antérieure limitant cette
intervention au test interne et interdisant la fusion.


Version **1.0.0**, `versionCode` **5**, package `ml.sossecurite.app`.
Compte Play autorisé : **MHM Digital Agency**. Éditeur : SahelPay Technologies.
Distribution prévue : **test interne uniquement** avant validation clinique et QA.

| Artefact EAS | Build | Taille (octets) | SHA-256 |
| --- | --- | ---: | --- |
| AAB production | `0dc0d008-34f5-4271-adb8-3aa3b204f724` | 120441703 | `091ee6475392079e3b7523e3e83e427721b76548fd9debc269e1da858457f325` |
| APK preview | `d29ad26e-5768-4fe8-9979-384bc6bf82ec` | 183377042 | `4f43a7734669a3734d6160f3b19b018092771ca23732ad3784ffc19a10bbaab5` |

- [Build AAB](https://expo.dev/accounts/dione24/projects/sos-securite-mali/builds/0dc0d008-34f5-4271-adb8-3aa3b204f724)
- [Build APK](https://expo.dev/accounts/dione24/projects/sos-securite-mali/builds/d29ad26e-5768-4fe8-9979-384bc6bf82ec)

Les deux artefacts utilisent le certificat d’upload EAS de publication, jamais Android Debug.
Empreinte SHA-256 : `35:44:B2:DD:ED:F5:91:B9:76:24:9A:CE:D8:5B:9A:50:BE:31:F4:EF:EB:56:03:BD:DA:1E:83:72:FF:C0:5D:E1`.
Les mots de passe et clés restent hors Git ; sauvegarde locale à accès restreint hors dépôt.

Contrôles effectués : signature AAB et APK, validation bundletool 1.18.3,
minSdk 24, targetSdk 36, `debuggable=false`, `allowBackup=false`.
Le contrôle du manifeste APK confirme les permissions minimales, Bluetooth facultatif,
absence de localisation en arrière-plan et service relais BLE isolé.
APK final code 5 installé en natif sur émulateur Android 12L / API 32 isolé et
sur **TECNO KN4 / Android 16**. Le relais réel démarre, s’arrête depuis l’application
et depuis la notification ; l’état de l’écran se resynchronise et la reprise de
recherche ne rediffuse pas l’ancienne alerte. Les réglages du téléphone ont été
vérifiés restaurés : 720 × 1576, densité 280, veille 30 s, animations 0,5, mode démo
inactif. Aucun relais ne reste actif ; aucune notification n’est encore différée.
Voir `QA_MATRIX.md` pour les limites des autres parcours physiques.

Contrôles supplémentaires du code 5 : `bundletool validate`, `zipalign -c -P 16 4`,
alignement ELF 16 Ko de 52 bibliothèques arm64/x86_64, permissions GPS uniques
sans limite API héritée. Le manifeste Gradle fusionné réel a aussi été contrôlé.

## Préflight final et distribution — 6 novembre 2026

`npm run preflight:monday -- <aab-code-5>` : **0 échec technique, 0 garde de
publication**. Les trois scénarios Maestro de la nouvelle interface passent sur
l’APK final code 5. La vidéo MP4 native passe son contrôle : 107,3 s, 720 × 1666,
1 963 099 octets. Empreinte :
`757041d628fdd8f695684755fb2cfeee49abda4a8b90dd7e359e30e9e0c4c268`.

Vidéo HTTPS publique vérifiée sans connexion (200, `video/mp4`, SHA identique) :
https://www.sahelpay.ml/apps/sos-securite-mali/foreground-service-connected-device.mp4

La release **1.0.0 (5) — Test interne** est **active**, accessible aux testeurs
internes, sortie le 6 novembre 2026 à 11 h 25 UTC. Google l’indique **non examinée**,
sous le nom temporaire `ml.sossecurite.app (unreviewed)`. Aucun déploiement public.
Lien d’inscription activé : https://play.google.com/apps/internaltest/4700776084224063532
Déclaration `FOREGROUND_SERVICE_CONNECTED_DEVICE` enregistrée avec le lien vidéo.
Les preuves techniques et vidéo sont dans `docs/release-evidence/`.

## Contrôles source

- Expo Doctor : 21/21 contrôles réussis.
- TypeScript : réussi.
- Vitest : 42 tests, 10 fichiers, réussis.
- Dépendances alignées sur Expo SDK 57 ; Reanimated 4.5.1 et Worklets 0.10.1.
- Audit des dépendances de production : 9 alertes restantes (5 modérées, 4 hautes),
  aucune critique. Elles concernent notamment expo-router / query-string /
  decode-uri-component et image-size. Leur résolution complète nécessite une analyse
  des chemins exploitables et, selon npm, une migration SDK majeure ; elle reste
  à traiter avant décision de diffusion publique. Ne pas confondre cet audit avec
  les tests fonctionnels réussis.

## Cartographie

Clé MapTiler configurée dans les environnements EAS production et preview,
visibilité **sensitive**. Une variable `EXPO_PUBLIC_` est incorporée dans le client :
elle ne constitue pas un secret serveur. Restriction de requête User-Agent à
`ml.sossecurite.app`, ajoutée par MapLibre avant chargement des écrans.
Vérification réseau : User-Agent attendu → HTTP 200 ; autre User-Agent → HTTP 403.
La clé littérale n’est jamais enregistrée dans Git.

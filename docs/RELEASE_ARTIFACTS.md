# Artefacts Android — 6 novembre 2026

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
APK final code 5 installé et testé sur émulateur Android 12L / API 32 isolé.
Le TECNO KN4 / Android 16 a exécuté les anciens APK codes 2/3 ; la déconnexion
USB empêche encore le retest physique du code 5 et la vidéo finale du service BLE.
Voir `QA_MATRIX.md` pour les limites des preuves.

Contrôles supplémentaires du code 5 : `bundletool validate`, `zipalign -c -P 16 4`,
alignement ELF 16 Ko de 52 bibliothèques arm64/x86_64, permissions GPS uniques
sans limite API héritée. Le manifeste Gradle fusionné réel a aussi été contrôlé.
Google Play accepte le bundle 5 (1.0.0), sans erreur bloquante ; avertissement
uniquement pour l’absence de fichier de désobscurcissement.

## Préflight final du 6 novembre 2026

`npm run preflight:monday -- <aab-code-5>` : **0 échec technique, 1 garde de
publication**, vidéo FGS manquante. Aucun contournement du garde. Les trois scénarios
Maestro de la nouvelle interface passent sur l’APK final code 5. La release
interne reste en brouillon ; aucun lien d’inscription actif n’est annoncé.

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

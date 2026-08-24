# Artefacts release locaux — 10 août 2026

Ces fichiers prouvent que la V1 compile, mais **ne doivent pas être envoyés en
production** : la build Gradle locale utilise encore le certificat Android Debug.
L'AAB final sera produit par le profil EAS `production` ou avec le keystore de
publication, puis testé sur la piste interne Google Play.

| Artefact | Taille approximative | SHA-256 | Usage |
| --- | ---: | --- | --- |
| `android/app/build/outputs/apk/release/app-release.apk` | 175 Mo | `3e3db42fdf1a68075de734dd2d90a1b7c4def267c0bdd1786a2d15357d7cc22f` | QA USB uniquement |
| `android/app/build/outputs/bundle/release/app-release.aab` | 115 Mo | `20c99fa813761e0bcda355516bcf75677457b0ef443460a623fa95fa3a301a4a` | Contrôle local uniquement |

Propriétés inspectées :

- package `ml.sossecurite.app` ;
- version `1.0.0` (`versionCode` 1) ;
- minSdk 24, targetSdk 36, compileSdk 36 ;
- APK signé en schéma v2 ;
- certificat local `CN=Android Debug` ;
- sauvegarde Android désactivée (`allowBackup=false`) ;
- Bluetooth classique et Bluetooth LE déclarés facultatifs pour ne pas exclure
  les appareils sans relais compatible ;
- permissions Bluetooth historiques limitées à API 30 et scan Android 12+
  déclaré `neverForLocation` ;
- matériel de localisation déclaré facultatif, le SOS restant utilisable sans GPS ;
- permissions héritées `READ_EXTERNAL_STORAGE` et `WRITE_EXTERNAL_STORAGE`
  absentes ; le choix d'une photo passe par le sélecteur système ;
- permissions `USE_BIOMETRIC` et `USE_FINGERPRINT` absentes, aucune clé V1
  n'utilisant `requireAuthentication` ;
- seul le service relais BLE natif est conservé, non exporté ;
- la divulgation Bluetooth précède désormais toute permission système depuis
  l'onglet Relais comme depuis le bouton de diffusion de l'écran SOS ;
- un refus affiche une explication simple et un accès direct aux réglages ; les
  appels et SMS restent disponibles ;
- une alerte reçue n'est marquée « relayée » qu'après confirmation effective du
  démarrage de l'annonce BLE Android ;
- aucune clé MapTiler n'est embarquée dans le bundle JS local ;
- les 47 étapes françaises possèdent une narration IA préenregistrée et embarquée ;
  la lecture ne demande ni microphone ni permission audio ;
- le bouton d'appel ouvre directement le composeur Android avec le numéro prérempli,
  sans contrôle de visibilité d'application susceptible de produire un faux refus ;
- l'annuaire contient 27 contacts recherchables, avec les lignes nationales et les
  contacts clients ou dépannage d'EDM-SA et de la SOMAGEP-SA ;
- toucher un lieu ou un repère ouvre directement son itinéraire ; aucun panneau de
  détail n'est ajouté hors de la zone visible ;
- APK final de la refonte claire installé avec succès sur le TECNO KL5 (API 34)
  et l'émulateur (API 32) ; le sélecteur photo a été ouvert sur API 32 sans
  permission stockage.

Après génération du véritable AAB de production, remplacer les empreintes ci-dessus
et vérifier la signature avant tout téléversement. Le contrôle doit réussir ; il
refuse volontairement l'AAB QA actuel :

```bash
npm run preflight:monday -- /chemin/vers/application-production.aab
```

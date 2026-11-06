# Bundle Android SOS Sécurité Mali 1.0.1 (6)

Le bundle complet de mise à jour des améliorations de réactivité a été compilé
sur EAS, avec le profil et l’environnement **production** existants et
`--freeze-credentials`. Le keystore distant existant a été réutilisé.
Aucune soumission ni action Play Console n’a été effectuée ; la préparation ne
modifie pas la version 1.0.0 (5) déjà envoyée à Google.

## Build et provenance

- [Build EAS 012c247f-690b-4040-9f23-ba2708587387](https://expo.dev/accounts/dione24/projects/sos-securite-mali/builds/012c247f-690b-4040-9f23-ba2708587387), terminé le 2026-11-06T18:49:18.111Z.
- Compilation cloud Android complète, sans réassemblage d’un APK existant.
- Sources des performances : `267df535`. EAS affiche ce commit de base ;
  les métadonnées 1.0.1 (6) étaient présentes dans l’archive et ont ensuite été
  enregistrées dans `e1e384f`. Le vérificateur de manifeste lit désormais la
  version déclarée dans `app.json`.
- Aucun changement du contenu médical, du relais Bluetooth ou du schéma de base.

## Artefact contrôlé

| Contrôle | Résultat |
| --- | --- |
| Fichier | `sos-securite-mali-1.0.1-6.aab` |
| Taille | 120 446 751 octets |
| SHA-256 | `1ccba6773f54a07eff4cf5f950f4e65c76bea29b6927d5f524b8abfbd50d11ad` |
| Identifiant | `ml.sossecurite.app` |
| Version / code Android | `1.0.1` / `6` |
| Expo SDK | `57.0.0` |
| Android min / cible | API 24 / API 36 |
| Signature JAR | Vérifiée, certificat d’upload existant, hors Android Debug |
| SHA-256 du certificat | `35:44:B2:DD:ED:F5:91:B9:76:24:9A:CE:D8:5B:9A:50:BE:31:F4:EF:EB:56:03:BD:DA:1E:83:72:FF:C0:5D:E1` |
| Drapeaux | `debuggable=false`, `allowBackup=false` |
| Structure AAB | `bundletool validate` réussi, version 1.18.3 |
| Pages 16 Ko | `PAGE_ALIGNMENT_16K` dans le BundleConfig ; 52 bibliothèques ELF64 arm64/x86_64 conformes pour LOAD et RELRO |

Les marqueurs du nouveau cache météo, du bootstrap et de la lecture légère du
nom sont présents dans le bundle JavaScript compilé. Les journaux détaillés et
les accès de téléchargement restent hors Git.

## Validation et suite

TypeScript, 70 tests sur 13 suites, syntaxe du vérificateur shell et
`git diff --check` passent. La recette émulateur des améliorations est consignée
dans [PERFORMANCE-2026-11.md](PERFORMANCE-2026-11.md). Ce bundle cloud final n’a
pas été installé sur le Tecno dans cette préparation.

La PR de version reste ouverte pour revue. Fusion et soumission Google Play
sont des décisions distinctes ; aucun envoi automatique n’a été demandé à EAS.

# SOS Sécurité Mali — version Android 1.0.1 (7)

État documenté le **10 novembre 2026**. Package : `ml.sossecurite.app`.

Le nouvel AAB cloud a passé les contrôles statiques et les parcours natifs ciblés
décrits ci-dessous. La version **1.0.1 (7)** est accessible en test interne Play
depuis le **10 novembre à 16 h 48 UTC**. La production du code 7, **release 2**, a été envoyée à Google avec la fiche
corrigée. Le **10 novembre 2026 à 17 h 28 UTC**, la Console affiche
**« Modifications en cours d’examen »** pour **1.0.1 (7) — Sources et indépendance**.
Ce constat ne constitue ni une approbation ni une disponibilité publique.

## Motif et périmètre

Google Play a refusé la production **1.0.0 (5)** le 10 novembre pour les informations
gouvernementales présentées dans l’application : les références doivent être
accessibles et l’indépendance vis-à-vis du gouvernement doit être explicite.
La version de performances **1.0.1 (6)** était déjà en test interne depuis le
6 novembre à 19 h 32 ; elle ne doit pas être confondue avec la production refusée.

Le correctif rend la mention d’indépendance visible sur l’accueil et l’annuaire,
ajoute la page Sources, relie les numéros à leurs références et distingue les
informations historiques des références courantes. Le **80 333**, attesté par
une publication du 21 mars 2022, reste identifié comme **« Contact à confirmer »**
dans l’annuaire et est retiré des recommandations SOS automatiques.
Voir [DATA_SOURCES.md](DATA_SOURCES.md) pour les références et leurs limites.

Cette intervention ne change pas le contenu médical, le relais Bluetooth, le
schéma de base de données, ni les comptes ou profils utilisateur. Aucune
validation médicale ou clinique n’est revendiquée.

## Build et provenance

- [Build EAS 2ee1591b-7bbc-48b4-b483-d1481e1dd7ce](https://expo.dev/accounts/dione24/projects/sos-securite-mali/builds/2ee1591b-7bbc-48b4-b483-d1481e1dd7ce),
  **FINISHED** le **2026-11-10T16:34:35.229Z**.
- Compilation Android cloud complète avec le profil `production` et
  `--freeze-credentials` ; aucune nouvelle clé d’upload créée.
- Sources fonctionnelles : **`1f3f90d`**. EAS a incrémenté localement le code Android
  de 6 à **7** avant l’archivage. Le commit **`83f4bbc`** a ensuite enregistré cette
  version ; EAS affiche donc `1f3f90d` comme référence Git de base.
- Les sept marqueurs de conformité sont présents dans le bundle JavaScript
  compilé : indépendance, route Sources, accès depuis l’accueil, référence
  gouvernementale, EDM, SOMAGEP et section historique.

## Artefacts contrôlés

| Artefact | Taille | SHA-256 |
| --- | ---: | --- |
| `sos-securite-mali-1.0.1-7.aab` | 120 451 134 octets | `50d322d6aa72f4440eaa392d046ec3a0b5e873abaa4b9ccc6cabefda7093ed19` |
| `sos-securite-mali-1.0.1-7-universal.apk` | 183 540 303 octets | `6c59ccdc24b135344204ed73244dd65eb98b9c47c301aed23c68f6a424bddb05` |

L’APK universel a été généré depuis ce nouvel AAB et signé avec la clé d’upload
existante. Aucun ancien APK n’a été réassemblé pour produire cette version.

| Contrôle statique | Résultat |
| --- | --- |
| Identifiant et version | `ml.sossecurite.app`, `1.0.1`, code `7` |
| Signature AAB | 1 880 entrées de contenu vérifiées, toutes signées par le certificat d’upload attendu |
| Signature APK | Certificat identique à celui de l’AAB et à la clé existante ; hors Android Debug |
| Structure du bundle | `bundletool validate` réussi avec bundletool 1.18.3, outil vérifié par son empreinte |
| Android min / cible | API 24 / API 36 |
| Drapeaux | `debuggable=false`, `testOnly=false`, `allowBackup=false` |
| Permissions et services | Permissions interdites absentes, matériel Bluetooth facultatif, scan `neverForLocation`, service BLE `connectedDevice` non exporté, absence de service de localisation en arrière-plan |
| Pages de 16 Ko | BundleConfig `PAGE_ALIGNMENT_16K`, segments LOAD des 52 bibliothèques ELF64 arm64/x86_64 conformes, ZIP de l’APK vérifié par `zipalign -c -P 16 4` |
| Contenu natif dérivé | Bibliothèques de l’APK identiques à celles de l’AAB |

Empreinte SHA-256 du certificat d’upload :

`35:44:B2:DD:ED:F5:91:B9:76:24:9A:CE:D8:5B:9A:50:BE:31:F4:EF:EB:56:03:BD:DA:1E:83:72:FF:C0:5D:E1`

Ces contrôles d’alignement sont statiques. Ils ne constituent pas une recette
d’exécution sur un appareil dont le noyau utilise des pages de 16 Ko.

## Vérifications des sources et du web

- **TypeScript : réussi.**
- **86 tests réussis sur 14 fichiers.**
- **Trois scénarios web**, à **deux tailles d’écran**, en thèmes clair et sombre.
- Références HTTP vérifiées séparément avec réponses **200** ; cette vérification
  ne prouve pas que le navigateur natif de l’émulateur a affiché les pages.
- La fiche Play en français (France, `fr-FR`) corrigée a été enregistrée avec
  **quatre sources courantes**, la référence historique et la mention
  d’indépendance. La langue de cette fiche ne constitue pas un pays de diffusion.

## Recette native finale ciblée

Les passages retenus ont été réalisés sur un émulateur **API 36** stabilisé,
configuré avec **4 Go de RAM**, **quatre cœurs virtuels** et rendu GPU hôte.
Les réglages de priorité du processus hôte ont été appliqués avec
`taskpolicy -B -t 0 -l 0`. Aucune amélioration de performances n’est déduite de ces
réglages ou des temps d’attente de l’outillage.

| Passage | Résultat et preuve locale conservée hors Git |
| --- | --- |
| Accueil | Mention d’indépendance et accès Sources visibles ; `api36-home-valid.xml` |
| Sources | Page, mention d’indépendance et première référence gouvernementale visibles ; `api36-sources-valid.xml` |
| Annuaire | Affichage et accès aux références contrôlés sur une hiérarchie fraîche ; `api36-directory-fresh.xml` |
| Recherche historique | Recherche `80333`, résultat `80 333`, « Contact à confirmer » et source du 21 mars 2022 ; `api36-historical-result.xml` |
| Sources hors connexion après redémarrage de l’application | Mode avion activé, Wi-Fi et données mobiles coupés, application arrêtée puis relancée ; page Sources et référence visibles dans `api36-offline-cold-sources.xml` |

L’absence de réseau actif par défaut a été contrôlée séparément côté Android
(`active default network: none`). La présence locale de la page Sources hors
connexion ne prouve pas l’ouverture d’un site distant hors ligne. Les XML de la
page Sources montrent sa partie haute ; ils ne prouvent pas à eux seuls le
défilement et l’affichage natif de chacune des quatre cartes de sources.

Le lancement hors ligne consigné dans `api36-offline-coldstart.json` retourne
**`Status: timeout`**, `LaunchState: UNKNOWN` et **`WaitTime: 20760` ms**.
La page a ensuite été observée sur une capture de hiérarchie fraîche. Ce résultat
ne fournit **aucun benchmark de démarrage utilisable** et ne justifie aucune
revendication de gain de vitesse ou de réactivité.

L’émission d’une URI gouvernementale vers Android a été observée dans le journal
ActivityTaskManager sur API 32. **L’affichage de la page dans le navigateur natif
n’est pas validé** : le premier démarrage de Chrome n’a pas été finalisé. Cette
limite est distincte de la vérification HTTP et des parcours web.

Le contrôle de runtime effectué après ces passages, consigné dans
`api36-final-runtime-proof.json`, indique **aucun ANR depuis le démarrage** de cet
émulateur API 36. Le journal filtré `AndroidRuntime:E` / `ReactNativeJS:E` est vide.
Il s’agit d’un constat sur cette exécution ; il ne supprime pas l’ANR API 32
documenté ci-dessous. Les réseaux de l’émulateur ont ensuite été rétablis.

## Incidents et limites de la validation

Un **ANR réel du code 7** s’est produit sur l’émulateur API 32 le **10 novembre
à 16:46:29 UTC**, avec un délai d’acquittement d’événement tactile de **5 074 ms**.
La cause reste **indéterminée**. Le dump pris environ seize secondes plus tard
montre le main dans une attente ART/JNI lors du traitement vsync, sans identifier
de propriétaire de verrou ni de cause applicative. Il ne prouve pas une panne
ART, une faute JavaScript ou un bug applicatif qui aurait été corrigé.

Un premier émulateur API 36, configuré avec **2 Go de RAM**, a ensuite présenté
un ANR de **SystemUI avant tout lancement de SOS**. Sa charge invitée était
**41,36 / 17,85 / 6,74** pour quatre cœurs. Cela appuie le constat d’un environnement
d’émulation saturé pendant son initialisation, sans établir la cause de l’ANR
précédent. La recette finale décrite ci-dessus a été exécutée après stabilisation
de l’environnement à 4 Go.

Le premier outil de recette pouvait réutiliser un ancien XML lorsqu’un dump
UIAutomator ne produisait pas de nouvelle hiérarchie malgré un code de sortie nul.
Ces premières tentatives ne sont pas retenues comme preuve de navigation.
L’outil a été corrigé avec un verrou, un délai d’expiration distant et un fichier
interne unique ; les passages finaux reposent sur des hiérarchies fraîches.

Le bundle EAS **1.0.1 (6)** a également été retéléchargé et validé statiquement.
Ses **52 bibliothèques ELF64 sont identiques octet par octet** à celles du code 7,
avec les mêmes permissions et le même certificat. **Aucune comparaison dynamique
contrôlée des codes 6 et 7 n’a été exécutée** ; les contrôles statiques ne permettent
donc pas de conclure à l’absence de régression d’exécution.

Aucun appel téléphonique réel, SMS réel, relais BLE entre appareils physiques,
ni parcours utilisant des données réelles n’a été validé dans cette intervention.
Aucun visa médical ou clinique n’est ajouté.

## Éléments Play et suite

Le contrôle des éléments de publication passe avec **huit captures**, dont les
captures mises à jour [01-home.png](../store-assets/screenshots/01-home.png) et
[08-sources.png](../store-assets/screenshots/08-sources.png), ainsi que l’icône,
le visuel, la politique de confidentialité et la vidéo FGS existante.
Cette vidéo a été contrôlée : **107,3 secondes**, **720 × 1666**. Elle ne constitue
pas une nouvelle preuve de relais Bluetooth physique pour le code 7.

| Étape | État au moment de la rédaction |
| --- | --- |
| Test interne 1.0.1 (7) | Accessible depuis le 10 novembre 2026 à 16:48 UTC |
| Production 1.0.0 (5) | Refusée |
| Production 1.0.1 (7) | Release 2 envoyée pour examen, déploiement complet demandé |
| Fiche française corrigée | Enregistrée avec sources, historique et indépendance |
| Distribution publique prévue | Mali uniquement, un pays ; déploiement 100 % confirmé sur le récapitulatif de production |
| Contrôle ANR/logcat après les passages natifs ci-dessus | Aucun ANR depuis le démarrage de l’émulateur API 36 ; aucun message dans le filtre `AndroidRuntime:E` / `ReactNativeJS:E` |
| Envoi à l’examen du code 7 | Effectué le 10 novembre 2026 ; « Modifications en cours d’examen » constaté à 17:28 UTC |
| Examen Google | En cours ; aucune approbation revendiquée |
| Disponibilité publique | Non confirmée ; à vérifier après approbation Google |

Les preuves détaillées sont conservées hors Git dans le dossier local de
validation de cette version. Aucun identifiant de téléchargement temporaire,
secret, valeur d’environnement ou journal brut n’est publié dans ce document.

La publication gérée est désactivée dans la Console : le déploiement public
demandé dépend maintenant de la décision de Google. La capture du reçu
`play-examen-1.0.1-7.png` est conservée dans le dossier local de validation, hors Git.

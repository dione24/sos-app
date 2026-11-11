# Nafalan 1.0.2 — fiabilité et réactivité

Rapport du **11 novembre 2026**, version **1.0.2 (8)**, fusionnée dans `main`.
La source runtime courante est **`15bb5e5e27d7b049eb2268bd8cc0df2c43cb0db7`** :
maintenance des dépendances `ba8ff2c`, charte rouge `636fc72`, puis adaptation des
icônes de la barre système au thème actif `15bb5e5`.

**Dernière observation : après un refus concernant le lien de suppression des
données, la correction web a été publiée et le renvoi de production enregistré
le 11 novembre 2026 à 12:21 UTC. À 12:24 UTC, les contrôles automatiques sont
terminés et la Console affiche « Vos modifications sont en cours d'examen ».
Aucune approbation ni disponibilité publique n'est confirmée.** Le même AAB est
conservé. Voir [le motif exact et le reçu de correction](GOOGLE_PLAY_REFUSAL_2026_11_11.md).

[PR #6](https://github.com/dione24/sos-app/pull/6) fusionnée dans `main` :
`e52db5214d46c174c9704030ec10098f27b76749`. La release **1.0.2 (8) — Nafalan**
remplace la demande d'examen de la 1.0.1 (7). Elle prévoit le déploiement complet
**100 % au Mali**, avec le nouveau nom, l'icône, les huit captures rouges et le
visuel de présentation. La publication gérée reste désactivée : la diffusion
suivra l'approbation Google.


Les observations API 36 déjà acquises sur `4efb453`, `829539d` et `5e548d1` sont
conservées ci-dessous avec leur portée. Elles ne valident pas à elles seules le
rendu de la nouvelle charte ni le nouvel AAB. Les rapports
[1.0.1](RELEASE_1.0.1.md) et [1.0.1 (7)](RELEASE_1.0.1_7.md) restent historiques.

## Nom et compatibilité des données

Le nom visible **Nafalan** a été choisi et validé par le propriétaire du projet.
Sa source linguistique et la portée du changement sont consignées dans
[NAMING_NAFALAN.md](NAMING_NAFALAN.md). Le choix du nom ne constitue pas une preuve
de disponibilité comme marque ni une acceptation par les stores.

Le package Android et l'identifiant iOS restent `ml.sossecurite.app`, le slug
Expo `sos-securite-mali` et le schéma de liens `sosmali`. Le nom de la base
`sos-securite-mali-secure-v2.db`, l'identifiant SecureStore
`sos_mali_database_key_v1`, l'alias de signature Android
`sos_mali_mesh_origin_signing_v1` et le format d'export `sos-mali-medical-v2`
restent identiques. Le renommage ne prévoit ni effacement des dossiers, ni
rotation de ces clés. Le certificat de l'APK de recette correspond à la clé
upload existante. Les mises à jour par `install -r`, sans remise à zéro des données,
ont conservé le profil fictif **Audit Fictif** et son contact depuis le code 7.
Le profil fictif a également été conservé lors de la mise à jour du correctif
de navigation `829539d`, avant sa recette d'effacement. L'APK historique `5e548d1`
avait ajouté l'ajustement visuel des filtres des lieux. Ces essais précèdent
la maintenance et la charte du runtime courant.

La migration SQLite 2 → 3 ajoute des index et applique la rétention des données
SOS/mesh. Les tests vérifient la conservation des profils, contacts et anciens
doublons d'historique encore admissibles. La rétention ne supprime aucun dossier
médical ni contact : elle porte sur l'historique SOS (30 jours, 1 000 lignes
maximum), les identifiants de messages et les quotas d'origine.

## Bugs corrigés

| Parcours | Défaut traité | Comportement préparé |
| --- | --- | --- |
| Dossier médical | Validation de l'export exécutée pendant la saisie : un contact incomplet pouvait faire échouer le rendu | Le brouillon reste éditable ; validation à Enregistrer ou lors d'une action explicite de partage |
| Dossier et contacts | Profil exposé avant la fin de lecture des contacts ; sauvegardes séparées | Chargement commun avec état d'attente/erreur ; profil et contacts enregistrés dans une transaction |
| Import médical | Lecture non bornée du document, copie temporaire conservée et confirmation libérant trop tôt le verrou | Limite de 32 Ko avant lecture/analyse, validation des numéros, suppression de la copie privée, verrou jusqu'à la fin de confirmation et transaction |
| GPS | Recherches concurrentes, acquisition pouvant survivre à son écran et âge réel perdu | Acquisition partagée, annulation des demandeurs, délai borné, conservation de l'horodatage du fix et contrôle de fraîcheur ; précision élevée conservée pour le SOS |
| Météo | Une écriture du cache pouvait retarder une réponse réseau valide ; anciennes écritures/réponses susceptibles de revenir tard | Réponse valide rendue sans attendre l'écriture facultative, ordre des écritures conservé, invalidation des requêtes et écritures lors d'un effacement |
| Carte hors ligne | Ancien flag « prête » fiable à tort, création d'autres packs après interruption, listeners conservés | Réconciliation avec l'inventaire natif, identité du pack persistée, état prêt uniquement pour un pack complet, reprise du pack existant et nettoyage des listeners |
| Téléchargement de carte | Une route toujours focalisée pouvait continuer à télécharger après Home/verrouillage Android | Pause à `inactive`/`background`, départ refusé hors premier plan, reprise manuelle conservant le même pack |
| Filtres des lieux | « Pharmacies » coupé sur écran étroit | Libellés sur une ligne avec ajustement borné ; intitulé accessible conservé |
| Réseau cartographique | Configuration des en-têtes MapLibre liée au chargement du layout | Initialisation idempotente appelée avant carte et téléchargement |
| Relais BLE | Sessions de scan/lecture pouvant continuer après arrêt ou accepter des callbacks d'une ancienne session | Annulation par session, délais de lecture GATT et de nettoyage, limites de concurrence et du cache de pairs |
| Diffusion BLE native / FGS | Annulation tardive ou arrêt d'une ancienne requête pouvant interférer avec une nouvelle session | Générations et identifiants de requête isolés, promesse terminée à l'annulation, confirmation du service de premier plan et nettoyage après échec, timeout ou arrêt |
| Doublons et quotas mesh | Lectures puis écritures séparées permettant à plusieurs messages concurrents de revendiquer le même relais/quota | Réservation du message, quota et historique atomiques ; confirmation de relais idempotente |
| Écritures SQLCipher | Transactions concurrentes à sérialiser ; nécessité d'initialiser la nouvelle connexion d'écriture dédiée avec sa clé | File par base, connexion dédiée chiffrée avant sa première requête, rollback et libération après inactivité ; ceci ne démontre pas un ancien défaut de clé en production |
| Effacement | Travaux susceptibles d'écrire après suppression ; ancien dossier restant dans la pile et reset visant le conteneur Expo externe | Arrêt/attente des travaux avant effacement SQL, purge des copies privées médicales, position mémoire remise à zéro et `useNavigation().reset` sur le Stack utilisateur ; recette finale réussie |

Les imports directs des familles de police et des icônes et l'initialisation
différée de MapLibre accompagnent une **réduction mesurée des bundles**. Cette
mesure n'isole pas le gain de chaque modification et ne prouve pas un démarrage
plus rapide. L'initialisation du stockage et de l'affichage peuvent progresser
en parallèle ; un jalon Android de contenu affiché est ajouté, sans confondre
une Activity vide ou le chargement du dossier avec le contenu prêt.

## Mesures historiques des APK de recette API 36

| Élément | Référence code 7 | APK arm64 historique `5e548d1` |
| --- | --- | --- |
| Bytecode Hermes | 5 338 404 octets | 4 128 020 octets (**−22,67 %**) |
| Export JavaScript sans bytecode (comparaison de diagnostic) | 4 967 910 octets | 3 513 967 octets (**−29,27 %**) |

L'APK arm64 historique `5e548d1` mesure **70 605 798 octets**. Aucune comparaison de taille
d'APK équivalents ni mesure de vitesse, mémoire ou batterie sur téléphone physique
n'a été réalisée. Les pourcentages ci-dessus portent uniquement sur les bundles.

```text
APK historique 5e548d1 SHA-256 : d0447f2fb15d7b4697e4ac017ef1bb9ff39889c8b07e03d2f5f693e8a380350a
Certificat SHA-256 : 3544b2ddedf591b976249aced85b9a50be31f4efeb5603bdda1e8372ffc05de1
```

## Vérifications du runtime courant

| Vérification | Résultat observé |
| --- | --- |
| `npm test` sur `15bb5e5`, 11 novembre à **10:46:36 UTC** | **202 tests réussis / 24 fichiers**, 955 ms |
| `npm run typecheck` sur `15bb5e5` | Réussi |
| Audits npm complet et production | **0 vulnérabilité signalée**, après maintenance compatible SDK 57 |
| Installation propre / compatibilité | `npm ci` avec réapplication du patch, contrôle Expo et export Android Metro réussis lors de la maintenance |
| Tests JVM natifs du modèle BLE | **7 tests réussis** ; ne prouvent pas le transport physique |
| SQLite de test | `node:sqlite` en mémoire : concurrence, migration 2 → 3, rollback, rétention et effacement |
| R8 / ressources / ABI | Build final et contrôles statiques PASS : minification et shrink actifs, quatre ABI présentes ; détails ci-dessous |

Les pins, le patch CJS limité au packaging du décodeur 0.5.1, les contrôles de
compatibilité et leur maintenance sont documentés dans
[DEPENDENCY_MAINTENANCE.md](DEPENDENCY_MAINTENANCE.md). Les anciens signalements
npm ont été traités ; aucune migration forcée du SDK n'a été faite.

Les tests SQLite utilisent un moteur réel en mémoire, mais adaptent les appels
Expo et simulent les connexions natives et `PRAGMA cipher_version` ; voir
[src/db/__tests__/README.md](../src/db/__tests__/README.md).
Les doubles GPS, HTTP, AppState et BLE valident des transitions, pas une portée
radio ni des performances sur téléphone.

## Charte courante et recette visuelle

La [charte rouge](design/DESIGN.md), les icônes et les supports store proviennent
de `636fc72865a232f084b866ff4f498be9d91edb3c` ; le runtime `15bb5e5` adapte aussi
la barre système au thème actif. Le vert est réservé aux états de succès.
Les tests de contraste ne remplacent pas la recette mobile clair/sombre.
Les huit captures claires de la nouvelle charte ont été copiées en RGB et leurs
empreintes store actualisées. `verify:play-submission` passe ; les vues sombres
ont été relues. Les anciennes captures vertes ne sont plus le jeu retenu.

Les écrans physiques clair/sombre relus montrent une
charte cohérente et une barre système adaptée au thème. Les libellés
d'onglets sont tronqués sur cette configuration Tecno ; le layout 12 px avec
scaling activé et Label sur une ligne est inchangé depuis `5e548d1`. Une influence
de la préférence de taille de police est compatible avec le constat, sans être
mesurée ici. Aucun changement de ce réglage utilisateur ni nouvelle régression
liée aux couleurs n'est établi.

## Artefacts de production — contrôle statique PASS

Source **`15bb5e5e27d7b049eb2268bd8cc0df2c43cb0db7`**, arbre
`ba04ca8a778599b96fc366a7e4debacfdbc0ab62`. Gradle a réussi en **4 min 57 s** avec
cache de build et reset du cache Metro ; fin de validation statique le
**11 novembre 2026 à 10:51:05 UTC**.

| Artefact | Taille | SHA-256 |
| --- | --- | --- |
| AAB production | 115 906 525 octets | `af03cae92c963ac003762d6a78023209ad2bdae88b853ea5a0e5f21d5c7b4a2c` |
| APK production, quatre ABI | 170 457 197 octets | `5809de3267010aad0c2742f38daea81884d92dcd9ae4d3f1ff3ef12bd1e2f388` |
| Hermes courant | 4 129 524 octets | `7553491b62f714362e37a5d970ed4483e4a351c93d175dd15317ba125ee75b54` |

- Bundletool, signatures des **1 782 entrées payload AAB**, certificat upload
  existant `3544b2ddedf591b976249aced85b9a50be31f4efeb5603bdda1e8372ffc05de1`,
  API cible 36 / minimum 24 / version 1.0.2 (8) : **PASS**.
- Quatre ABI présentes : `armeabi-v7a`, `arm64-v8a`, `x86`, `x86_64` ; contrôles
  de **52 ELF64** et de l'alignement **16 Ko** : **PASS**.
- Hermes, assets applicatifs, DEX et **104 bibliothèques `.so`** identiques entre
  APK et AAB. Deux profils baseline Android sont relocalisés de métadonnées AAB
  vers `assets/dexopt` dans l'APK : leurs octets ont été comparés et sont égaux.
- Mapping R8 embarqué identique à la copie de contrôle : **69 664 763 octets**,
  SHA-256 `74d51088f8975af01a7a959215947b97801a830ea2decb7d8bacb546b5668dfc`,
  **26 924 classes mappées, 25 479 renommées**. La configuration contient
  `-dontoptimize` : aucune optimisation complète du DEX ni vitesse gagnée n'est
  revendiquée. Le mapping lui-même reste hors du dépôt public.
- Harnais privé absent de la source de production, du HBC brut et désassemblé,
  et des sourcemaps contrôlées. Son source et son empreinte restent hors Git.

Le HBC courant est **22,64 % plus petit** que celui du code 7 ; ce pourcentage
mesure des octets, pas la vitesse. Les APK quatre ABI et arm64 seul ne sont pas
comparables directement en taille. Les champs correspondants figurent dans
[le reçu de validation](validation/nafalan-1.0.2-8.json).

## Observations historiques de recette Android API 36

Essais réalisés sur les APK code 8 successifs de cette branche, sur un
**émulateur dédié**, avec des données fictives et sans données personnelles.
Les tests du dossier, de la carte et de la météo ont porté sur `4efb453`,
l'effacement corrigé sur `829539d`, puis les captures, les filtres et l'absence
d'erreur sur l'APK historique `5e548d1`. Les deux derniers ajustements ne changent ni
le stockage ni les services GPS, météo ou BLE :

| Parcours | Résultat observé |
| --- | --- |
| Mise à jour code 7 → 8, puis correctif de navigation | `install -r` sans reset ; profil Audit Fictif et contact conservés pendant la recette, profil conservé avant l'effacement final |
| Contact nommé avec téléphone partiel `1` | Aucun crash ; Enregistrer bloque avec « Vérifiez le dossier » |
| Contact corrigé en `22300000001` | Enregistrement réussi et conservation après redémarrage du processus |
| Carte hors ligne puis Home Android | Téléchargement mis en pause, bouton Reprendre affiché ; reprise du pack, progression de 16 % à 20 % |
| Météo en ligne puis réseau coupé | 29° en ligne, puis « Dernière prévision disponible » avec l'âge du cache hors ligne |
| Effacement après double confirmation | Retour au premier démarrage ; Retour Android puis réouverture restent au premier démarrage ; après passage sans dossier, l'onglet Dossier ne contient ni Audit Fictif ni Contact Fictif |
| Erreurs d'exécution | Aucun crash applicatif ni ANR observé pendant cette session API 36 |

Cette mise à jour valide les parcours profil/contacts observés sur l'installation
Android de recette utilisant SQLCipher. Elle ne remplace pas un test de charge
des écritures concurrentes natives ni une vérification exhaustive des connexions
chiffrées. La pause a été observée après Home ; le verrouillage n'a pas été testé
séparément. Ce tableau de recette émulateur ne valide ni un transport BLE
physique, ni iOS, ni un appel/SMS réel, ni une validation médicale/clinique.
Le parcours d'effacement corrigé vérifie la navigation et l'absence du profil et du
contact précédents dans l'application ; il ne constitue pas un stress test de
concurrence SQL. Les preuves natives sont conservées dans les séries de recette
`final-after-delete`, `final-back-reopen` et `final-empty-data`.

L'**ANR historique du code 7 sur l'émulateur API 32**, observé le 10 novembre à
16:46:29 UTC, reste de cause indéterminée. Les corrections de cette livraison
ne prouvent pas qu'il est résolu. L'absence d'ANR pendant la session API 36 du
candidat ne permet ni de l'expliquer ni de garantir l'absence globale de
régression. Voir les preuves et limites du
[rapport 1.0.1 (7)](RELEASE_1.0.1_7.md#incidents-et-limites-de-la-validation).

## Recette Bluetooth privée — résultat et limites

Passe physique du **11 novembre, 10:47:53 → 10:50:06 UTC**, sur le paquet isolé
`ml.sossecurite.app.qa`. Le harnais temporaire reste absent de la production.
Aucun appel, SMS, donnée médicale réelle ni position n'a été utilisé.

Sur un Tecno sous Android 16, une alerte technique **Autre/faible sans position**,
signée P256 par le banc Mac, a été **reçue, validée puis retransmise** par
l'application. Le démarrage et l'arrêt du service Bluetooth ont été observés
dans l'interface et les états natifs. Lecture de la fixture par Android à
10:48:31, état « Transmise » / faible et FGS actif à 10:48:47, arrêt avec FGS
inactif à 10:48:56.

La **lecture du paquet Android par le Mac**, l'**acquittement radio du TTL 2 → 1**
et l'**interopérabilité entre deux Android** restent **non validés**. Le harnais
Android a signé son origine et son service a démarré puis été arrêté ; le Mac
a découvert et connecté ce pair, sans lecture de paquet validée. Aucun
aller-retour complet ni plusieurs sauts réels ne sont revendiqués.

La purge QA après deux confirmations et la restauration finale ont réussi :
720 × 1576, densité 280 et mode nuit `no`. Veille, administration de l'appareil
et alimentation Bluetooth n'ont pas été modifiées. Les captures publiques ont
été réalisées après purge. Les arrêts UI observés sont distincts du nettoyage
système final ; l'arrêt automatique du harnais n'est pas déclaré testé par ce
passage. Les MP4 privés montrent le démarrage et l'activité ; l'arrêt manuel est
qualifié par les PNG frais et états de service natif avant/après, pas par une
séquence vidéo STOP complète. La QA a ensuite été désinstallée et le paquet de
production préexistant préservé. Un timeout ou une absence de lecture ne
constitue pas un échec général du transport.

## Politique et livraison

La politique **Nafalan avec CSS rouge est déployée**, revue en navigateur et
vérifiée en ligne. Source web :
[`3eadcac6ec7b740728bfa9ab8577d31b8e1628d0`](https://github.com/dione24/sahelpay-landing/commit/3eadcac6ec7b740728bfa9ab8577d31b8e1628d0),
[politique publique](https://www.sahelpay.ml/apps/sos-securite-mali/privacy).
Le fichier HTML local et ce déploiement web restent deux artefacts distincts.

Les **huit captures claires RGB** de la charte finale sont en place, leurs
empreintes sont actualisées et le contrôle `verify:play-submission` passe.
Les vues sombres et la barre système ont été contrôlées sur les captures natives. La vidéo FGS
publique conservée reste celle du **code 5**, preuve historique ; les clips du
banc privé ne sont pas présentés comme une nouvelle démonstration publique de
tous les parcours de la version Play.

Play Console estime la **nouvelle installation à 27,2 Mo**, soit **11,9 Mo de
moins que le code 7**. C'est une estimation de distribution, pas un gain de
vitesse mesuré sur téléphone ni la taille de l'APK universel quatre ABI.

La demande de production a été enregistrée dans la Console (release `3`, piste
production) après confirmation de « Recommencer l'examen ». Cette confirmation
annule et relance la demande précédente pour examiner la nouvelle version.
La Console affiche la 1.0.2 (8) sous « Modifications en cours d'examen » et n'affiche
plus de modifications non envoyées. Les vérifications rapides sont terminées : la Console confirme l’examen de
la nouvelle version, sans action d’envoi restante.

L'enregistrement de cette demande ne constitue ni une approbation Google ni une
preuve de disponibilité publique. Aucun délai de validation n'est garanti.
Le reçu structuré de cette livraison est
[validation/nafalan-1.0.2-8.json](validation/nafalan-1.0.2-8.json).

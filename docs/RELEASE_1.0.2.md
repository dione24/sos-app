# Nafalan 1.0.2 — fiabilité et réactivité

Rapport du **11 novembre 2026**. Candidat de recette (staging) sur
`fix/reliability-performance-20261111`, à partir de `445b140`.
L'**APK final de recette release arm64 1.0.2 (8)** a été compilé depuis
`5e548d12ee274552664bbe0881d5583d91f0ad4b` et signé avec la clé upload existante.

**Statut : APK de recette testé, non publié, non soumis aux stores, branche non
fusionnée. Aucun AAB de production ni upload Play pour ce candidat.** La recette
Android API 36, y compris le parcours d'effacement et la disparition de l'ancien
dossier, a réussi. Les huit captures de fiche ont été renouvelées et contrôlées
depuis cet APK (1080 × 1920, RGB, aucune donnée personnelle).
Aucun résultat de la version 1.0.1 (7) n'est présenté comme une validation de
1.0.2. Les rapports [1.0.1](RELEASE_1.0.1.md) et
[1.0.1 (7)](RELEASE_1.0.1_7.md) restent inchangés.

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
de navigation `829539d`, avant sa recette d'effacement. Le dernier APK `5e548d1`
ajoute uniquement l'ajustement visuel des filtres des lieux.

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

## APK final de recette et tailles mesurées

| Élément | Référence code 7 | Candidat code 8 |
| --- | --- | --- |
| Bytecode Hermes | 5 338 404 octets | 4 128 020 octets (**−22,67 %**) |
| Export JavaScript sans bytecode (comparaison de diagnostic) | 4 967 910 octets | 3 513 967 octets (**−29,27 %**) |

L'APK arm64 de recette mesure **70 605 798 octets**. Aucune comparaison de taille
d'APK équivalents ni mesure de vitesse, mémoire ou batterie sur téléphone physique
n'a été réalisée. Les pourcentages ci-dessus portent uniquement sur les bundles.

```text
APK SHA-256 : d0447f2fb15d7b4697e4ac017ef1bb9ff39889c8b07e03d2f5f693e8a380350a
Certificat SHA-256 : 3544b2ddedf591b976249aced85b9a50be31f4efeb5603bdda1e8372ffc05de1
```

## Vérifications exécutées

| Vérification | Résultat observé |
| --- | --- |
| `npm test`, dernier passage le 11 novembre à 09:09 UTC | **188 tests réussis sur 22 fichiers**, aucune suite ignorée |
| `npm run typecheck` sur la source finale | Réussi |
| Compilation Gradle de l'APK final | **BUILD SUCCESSFUL**, 41 secondes |
| Tests carte hors ligne ciblés | **20 tests réussis**, incluant arrière-plan, création native tardive, reprise et nettoyage |
| SQLite réel de test | `node:sqlite`, données synthétiques en mémoire : concurrence, quotas, rollback, migration 2 → 3, rétention et effacement |
| Tests JVM natifs exécutés avec Gradle | **7 tests réussis** du modèle de session BLE ; aucune preuve de transport entre téléphones |

Les 188 tests et TypeScript ont été relancés avec succès sur la source finale.
Les 7 tests JVM ont été exécutés avant les derniers ajustements TypeScript de
navigation et de libellé ; le code natif BLE n’a pas changé depuis ce passage.
Le runtime Node expose `node:sqlite` ; la suite n'a donc pas été ignorée.
Les tests adaptent les appels Expo et simulent la création
des connexions natives ainsi que `PRAGMA cipher_version`. Leur portée exacte
est documentée dans [src/db/__tests__/README.md](../src/db/__tests__/README.md).

Les tests GPS, HTTP, AppState et BLE utilisent des doubles contrôlés. Ils
vérifient les transitions et les interruptions, pas la précision radio réelle,
la portée Bluetooth ou les performances d'un téléphone physique.

## Recette native Android API 36

Essais réalisés sur les APK code 8 successifs de cette branche, sur un
**émulateur dédié**, avec des données fictives et sans données personnelles.
Les tests du dossier, de la carte et de la météo ont porté sur `4efb453`,
l'effacement corrigé sur `829539d`, puis les captures, les filtres et l'absence
d'erreur sur l'APK final `5e548d1`. Les deux derniers ajustements ne changent ni
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
séparément. Aucun transport BLE sur téléphones physiques, essai iOS, appel/SMS
réel ou visa médical/clinique n'est validé par cette intervention.
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

## Points restant hors de cette correction

Le triage `npm audit` du 11 novembre signale 9 nœuds de dépendances (4 high,
5 moderate), correspondant à 6 avis distincts. Une partie concerne l'outillage
Metro/fingerprint ; une dépendance de décodage d'URI existe aussi dans le graphe
runtime, sans chemin d'exploitation démontré dans le parseur standard Expo.
Aucune mise à jour forcée du SDK ou du lockfile n'a été appliquée ici. Une
maintenance compatible des dépendances reste à réaliser séparément ; ces
signalements ne constituent pas une cause démontrée des lenteurs ordinaires.

## Publication

La mise à jour du nom dans les écrans et la préparation de textes de fiche ne
constituent ni une publication, ni un examen Google/Apple du candidat 1.0.2.
Huit captures natives de l'APK final de recette ont été renouvelées et contrôlées
visuellement, sans données personnelles, puis encodées en RGB sans modifier
leurs pixels opaques. Leurs empreintes sont dans `store-assets/CHECKSUMS.sha256`. La vidéo FGS historique
du code 5 est conservée et ne prouve pas le comportement du nouveau build.
Le HTML de confidentialité Nafalan est préparé localement et **non déployé**.
Le statut éventuel d'une version précédente reste distinct. Le reçu d'un envoi
et l'état réellement affiché par le store devront être consignés ici avant
de revendiquer une soumission ou une disponibilité publique.

Reçu vérifiable de l'artefact et des contrôles :
[validation/nafalan-1.0.2-8.json](validation/nafalan-1.0.2-8.json).

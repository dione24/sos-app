# Nafalan 1.0.2 — fiabilité et réactivité

Rapport du **11 novembre 2026**. Candidat de recette (staging) préparé sur
`fix/reliability-performance-20261111`, à partir de `445b140`.
La configuration courante porte la version **1.0.2**, code Android **8**.
Ces valeurs décrivent la source préparée ; elles ne certifient pas encore un
artefact de production signé ni son contenu final.

**Statut de ce candidat : non publié, non soumis aux stores.** La compilation
et la recette Android sont en cours et leurs résultats doivent compléter ce
rapport. Aucun résultat de la version 1.0.1 (7) n'est présenté comme une
validation de 1.0.2. Les rapports [1.0.1](RELEASE_1.0.1.md) et
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
rotation de ces clés. Le certificat de signature de l'artefact final et une
mise à jour conservant les données doivent encore être contrôlés séparément.

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
| Réseau cartographique | Configuration des en-têtes MapLibre liée au chargement du layout | Initialisation idempotente appelée avant carte et téléchargement |
| Relais BLE | Sessions de scan/lecture pouvant continuer après arrêt ou accepter des callbacks d'une ancienne session | Annulation par session, délais de lecture GATT et de nettoyage, limites de concurrence et du cache de pairs |
| Doublons et quotas mesh | Lectures puis écritures séparées permettant à plusieurs messages concurrents de revendiquer le même relais/quota | Réservation du message, quota et historique atomiques ; confirmation de relais idempotente |
| Écritures SQLCipher | Transactions concurrentes et nouvelle connexion pouvant être ouverte sans sa clé | File par base, connexion d'écriture dédiée chiffrée avant sa première requête, rollback et libération après inactivité |
| Effacement | Travaux GPS, réseau ou mesh susceptibles d'écrire après suppression ; ancien dossier pouvant rester dans la pile | Arrêt/attente des travaux avant effacement SQL, purge des copies privées médicales, position mémoire remise à zéro et réinitialisation de la navigation |

Les imports directs des familles de police et des icônes réduisent le travail
chargé au démarrage. L'initialisation du stockage et celle de l'affichage peuvent
progresser en parallèle. Un jalon Android local de contenu affiché a été ajouté ;
il ne remplace pas une mesure contrôlée et ne doit pas être confondu avec
l'affichage initial d'une Activity vide. Aucun gain chiffré de temps, mémoire ou
batterie n'est revendiqué ici.

## Vérifications exécutées

| Vérification | Résultat observé |
| --- | --- |
| `npm test`, 11 novembre à 08:25 UTC | **188 tests réussis sur 22 fichiers**, aucune suite ignorée |
| `npm run typecheck` après le correctif AppState | Réussi |
| Tests carte hors ligne ciblés | **20 tests réussis**, incluant arrière-plan, création native tardive, reprise et nettoyage |
| SQLite réel de test | `node:sqlite`, données synthétiques en mémoire : concurrence, quotas, rollback, migration 2 → 3, rétention et effacement |

Les anciens comptes intermédiaires de 181 ou 184 tests ne décrivent pas le
dernier passage ci-dessus. Le runtime Node expose `node:sqlite` ; la suite n'a
donc pas été ignorée. Les tests adaptent les appels Expo et simulent la création
des connexions natives ainsi que `PRAGMA cipher_version`. Leur portée exacte
est documentée dans [src/db/__tests__/README.md](../src/db/__tests__/README.md).

Les tests GPS, HTTP, AppState et BLE utilisent des doubles contrôlés. Ils
vérifient les transitions et les interruptions, pas la précision radio réelle,
la portée Bluetooth ou les performances d'un téléphone physique.

## Validation native à compléter

Les résultats d'APK, de signature, de migration chiffrée et de parcours Android
seront ajoutés après la recette du candidat final. À ce stade, ce rapport ne
confirme pas :

- une migration SQLCipher Android 2 → 3 sur installation de recette existante,
  avec profil et contacts fictifs conservés après mise à jour puis redémarrage ;
- la bonne initialisation de chaque connexion native chiffrée et les écritures
  simultanées sans erreur de verrou ou de transaction imbriquée sur Android ;
- la pause réelle du téléchargement après Home/verrouillage et la reprise sur
  l'appareil de recette ;
- le transport BLE sur plusieurs téléphones physiques, ses restrictions en
  arrière-plan, sa portée ou son coût batterie ;
- la compatibilité iOS de cette livraison, un appel/SMS réel ou une validation
  clinique des contenus.

L'**ANR historique du code 7 sur l'émulateur API 32**, observé le 10 novembre à
16:46:29 UTC, reste de cause indéterminée. Les corrections de cette livraison
ne prouvent pas qu'il est résolu. Le constat sans ANR d'une exécution API 36 de
la version précédente ne permet ni de l'expliquer ni d'exclure une régression
dans le nouveau candidat. Voir les preuves et limites du
[rapport 1.0.1 (7)](RELEASE_1.0.1_7.md#incidents-et-limites-de-la-validation).

## Publication

La mise à jour du nom dans les écrans et la préparation de textes de fiche ne
constituent ni une publication, ni un examen Google/Apple du candidat 1.0.2.
Le statut éventuel d'une version précédente reste distinct. Le reçu d'un envoi
et l'état réellement affiché par le store devront être consignés ici avant
de revendiquer une soumission ou une disponibilité publique.

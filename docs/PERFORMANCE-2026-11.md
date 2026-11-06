# Réactivité de SOS Sécurité Mali — 6 novembre 2026

Corrections préparées à la demande du propriétaire sur la base `c2b4ff7`.

## Changements vérifiables

| Parcours | Avant | Après |
| --- | --- | --- |
| Navigation après ouverture | 3 lectures SQLite à chaque changement de route, dont le dossier complet | Lecture de présence du dossier et de 2 préférences une fois par session de base ; aucune relecture du bootstrap pour une navigation ordinaire |
| Accueil | Animation active même hors écran ; dossier complet chargé pour le prénom | Animation arrêtée au changement d’onglet, sans bloquer les interactions ; sélection SQL du nom uniquement au retour |
| Carte | Réglages relus quand la position change ; choix liste/carte réinitialisé | Réglages au focus, GPS indépendant et dédupliqué, choix utilisateur conservé ; moteur natif absent hors focus, cadrage mémorisé dans une ref |
| Météo avec cache récent | Réseau interrogé malgré le cache | Cache du lieu correspondant réutilisé pendant 15 minutes ; Actualiser force le réseau |
| 3 requêtes météo simultanées, même base et lieu, sans cache | 3 vérifications réseau et 3 requêtes HTTP (reproduction synthétique avant correction) | 1 vérification et 1 requête HTTP |
| Réseau météo bloqué | Pas de délai borné | 6 secondes maximum pour état réseau, requête et lecture JSON, puis cache correspondant ou indisponibilité explicite |
| Écran météo | Cache montré après l’attente GPS/réseau | Cache avec lieu et ancienneté montré avant ces attentes ; réponse ancienne ignorée après changement de lieu |

Le cache conserve au maximum Bamako et la dernière position autorisée, dans les réglages SQLite chiffrés existants. Un ancien cache non localisé peut être montré comme dernière prévision pendant la recherche, mais ne devient jamais une prévision des nouvelles coordonnées. L’absence de données ne fabrique pas de température ou de probabilité de pluie.

## Validation

- TypeScript : passe.
- 70 tests passent sur 13 suites, dont les transitions premier lancement/création/passage/suppression, la mémorisation du cadrage et 17 tests météo.
- Réseau, GPS et base simulés en mémoire ; aucune donnée médicale réelle utilisée.
- Le chargeur Vitest `runner` permet les vérifications depuis le worktree avec node_modules lié : `npm test -- --configLoader runner`.
- Aucune mesure de temps ni de mémoire sur téléphone n’a encore été effectuée. Les nombres ci-dessus décrivent les appels et comportements vérifiés, pas un gain en millisecondes mesuré sur le Tecno.

## Essais Android avant fusion/publication

1. Démarrage avec dossier existant puis navigation entre les onglets ; vérifier l’absence de nouvelle étape de bootstrap.
2. Sur une installation de recette distincte : premier lancement, création ou passage du dossier, puis suppression explicite depuis Réglages et retour à l’onboarding. Ne pas supprimer le dossier réel du propriétaire pour ce test.
3. Déplacer, zoomer et incliner la carte ; revenir depuis un autre onglet et depuis la liste ; vérifier que cadrage, filtre et mode sont conservés, y compris si le départ se produit pendant un geste.
4. Choisir la liste, obtenir une position GPS et vérifier que la vue ne passe pas seule en carte.
5. Ouvrir la météo avec un cache, réseau lent puis absent ; voir immédiatement le lieu et l’âge, vérifier Actualiser, changer de lieu et attendre une ancienne réponse.
6. Contrôler le bouton SOS, l’annuaire, les guides et le retour accueil sans émettre d’appel, de SMS ou d’alerte réelle.

L’attente GPS initiale peut toujours prendre plusieurs secondes quand aucune position n’est disponible ; le cache n’attend plus cette recherche. La première récupération de tuiles et le premier chargement réseau restent dépendants de la connexion.

## Recette Android isolée du 6 novembre

22 vérifications passent sur un AVD neuf API32/arm64 avec l’image système déjà
présente sur le Mac. Premier lancement, passage sans dossier, création et
modification d’un dossier fictif, navigation, annulations puis suppression
confirmée restent corrects après redémarrage du processus. Aucun dossier réel
ni téléphone du propriétaire n’a été utilisé pour cette recette.

La carte native affiche les rues de Bamako. Après déplacement et retour
d’onglet, le cadrage rendu est identique à celui quitté ; les modes carte et
liste sont conservés. La météo réelle en ligne passe au cache sans réseau
Android actif, finit son actualisation hors ligne et retrouve ce cache après
redémarrage. Aucun crash SOS n’est présent dans le buffer Android contrôlé.

La mesure ActivityManager (trois essais après échauffement) donne une médiane
de 568 ms pour la référence et 629 ms pour le candidat. Ce petit échantillon ne
démontre aucun gain de démarrage natif, ne mesure pas l’arrivée du contenu JS
utilisable et ne s’extrapole pas au Tecno. Les améliorations vérifiées portent
sur le travail évité, le cache et la navigation. Les temps et la mémoire sur
appareil physique restent à mesurer. Aucun appel, SMS, SOS ou relais Bluetooth
n’a été déclenché ; réseaux de l’AVD rétablis, puis émulateur arrêté.

Le bundle de production nécessite une compilation complète avec incrément de
version ; l’APK de recette reconstruit n’est pas un artefact de publication.

# Matrice QA — SOS Sécurité Mali 1.0.0

## Vérification de la refonte — 6 novembre 2026

### Artefact final : 1.0.0 (5)

APK EAS preview signé testé en natif sur **Android 12L / API 32 ARM64**,
émulateur isolé créé pour cette publication, sans compte Google ni donnée réelle.
Écran 1080 × 1920. Aucune capture web ni barre Expo. Les versions APK et AAB
finales ainsi que leurs empreintes sont consignées dans `RELEASE_ARTIFACTS.md`.

| Parcours / contrôle | Résultat observé sur le code 5 |
| --- | --- |
| Installation release / signature | Réussi, versionCode 5 et certificat d’upload attendu |
| Trois scénarios Maestro actualisés | Réussis en 1 min 07 s : onboarding/SOS agression, annuaire/guides, confidentialité/liste Bamako |
| SOS sans dossier / position refusée | Réussi ; appel médical 122 ou agression 101 accessible, aucun appel/SMS envoyé |
| Refus Bluetooth puis réouverture du consentement | Réussi ; refus explicite conservé, pas de fausse activité Bluetooth sur émulateur |
| Dossier fictif + contact international réservé | Création/enregistrement réussis ; aucune donnée personnelle |
| Modifier puis abandonner | Réussi ; le dossier initial est restauré |
| Redémarrage à froid / dossier | Réussi ; base rouverte, profil et contact conservés |
| QR médical | Affiché localement avec son avertissement de confidentialité |
| Export JSON | Feuille Android ouverte sur `dossier-sos-mali.json`, annulée sans partage externe |
| Import V2 valide | Confirmation de remplacement, import réussi, nouveau nom visible |
| Double effacement local | Deux confirmations, retour onboarding puis absence du profil et du contact fictifs |
| Carte MapTiler native | Téléchargement complet, état « Prête », fond de carte et marqueurs Bamako visibles |
| Carte hors ligne après redémarrage | Réussi avec Wi-Fi et données mobiles désactivés sur l’émulateur |
| Météo réseau puis hors ligne | Prévision réelle de Bamako puis cache explicite « Dernière prévision » avec âge ; aucune position personnelle |
| Mode sombre / texte système 200 % | Accueil, SOS et guide RCP consultables ; appel fixe accessible, suite du formulaire disponible par défilement |
| Guide vocal hors ligne | Première étape en état « Lecture en cours », fichier embarqué disponible, audio physique non validé sur émulateur |
| Captures finales | Sept PNG RGB 1080 × 1920 relus puis importés en ordre dans Play |
| Manifeste final | Permissions GPS uniques non limitées ; fusion Gradle réelle et APK/AAB contrôlés |
| Compatibilité 16 Ko | zipalign réussi, 52 ELF arm64/x86_64 contrôlés sans échec |
| Préflight final | 0 échec technique, 0 garde publication ; MP4 FGS valide |

Les trois scénarios Maestro passent sur le code 5. Les essais RCP longue durée
ont été effectués sur le code 3 (même écran RCP) : **7 min 36 s, 837 impulsions**,
maintien d’écran actif malgré une veille de 15 s, arrêt par maintien et absence
de redémarrage accidentel. Le code 5 a aussi été démarré et arrêté pour sa capture
RCP. La sortie audio et les vibrations physiques ne sont pas validées par un
émulateur sans audio.

### Téléphone physique : vérifications partielles

**TECNO KN4, Android 16**, écran physique 720 × 1576, densité 280.
Le téléphone disponible est un KN4, pas le KL5 du rapport historique d’août.
La politique d’administration limite la veille à 60 secondes ; elle n’est pas modifiée.

Sur les anciens APK codes 2/3 : installation signée, accès sans dossier, SOS sans
position, confirmation appel 122 puis retour sans appeler, première narration RCP,
refus/réouverture de consentement Bluetooth, autorisations appareils proches et
notifications, annonce GATT et service `BleRelayForegroundService` réellement actif
(`isForeground=true`, type connectedDevice, notification ID 122 avec action d’arrêt).
Le défaut d’état du bouton d’arrêt a été corrigé dans le code 5 : observation de
l’état natif, arrêt synchronisé, suppression des rediffusions automatiques de
l’historique. **Retest physique final réussi**, voir ci-dessous.

Le code 5 a ensuite été installé et testé sur le **TECNO KN4 / Android 16** :

| Parcours physique code 5 | Résultat |
| --- | --- |
| SOS fictif « Autre », sans position | Réussi ; aucune position personnelle |
| Refus puis réouverture du consentement BLE | Réussi, avant l’autorisation Android |
| GATT / FGS / notification | Démarrage natif réel, type connectedDevice, notification ID 122 |
| Arrêt depuis l’application | Réussi ; FGS absent après l’action |
| Repartage explicite | Réussi ; FGS actif après action volontaire |
| Arrêt depuis notification | Réussi ; FGS absent, écran revenu sur le bouton de repartage |
| Pause et nouvelle demande de recherche | Aucun redémarrage de l’ancienne alerte |
| Vidéo | Deux séquences natives, MP4 final 107,3 s, 720 × 1666, validé |
| Restauration du téléphone | Résolution 720 × 1576, densité 280, veille 30 s, animations 0,5, mode démo inactif ; tous vérifiés |
| Notifications / service en fin de test | Aucune notification encore différée, aucun relais actif |

L’APK preview de cette installation QA a été retiré du profil personnel après les
essais, ainsi que les fichiers de démonstration, afin de laisser installer la version
signée par Google Play. Aucun profil professionnel n’a été désinstallé.

Aucun appel/SMS, aucune donnée médicale réelle et aucune position personnelle n’ont
été utilisés. Les données réinitialisées étaient celles de cette installation QA :
dossier vide et alertes fictives créées par les essais.

### Limites restant à lever

- Parcours complet physique, audio/haptique, GPS simulé accepté/timeout, composeur
  SMS avec destinataires fictifs, import invalide, TalkBack.
- Trois Android pour vérifier le transfert et les sauts BLE ; ne pas promettre un
  multi-hop garanti. Un seul téléphone et un émulateur ne constituent pas cette preuve.
- iOS hors de la demande de publication Android ; aucun essai iPhone effectué ici.
- Relecture clinique locale signée avant toute promotion publique.

## Historique du 10 août 2026 (ancienne build)


## Automatisation

| Contrôle | Résultat |
| --- | --- |
| TypeScript strict | Réussi |
| Vitest, logique critique | 39 tests réussis |
| Expo Doctor | 20/20 |
| Dépendances Expo | `expo install --check` réussi |
| Build Android debug API 36 | Réussi |
| Build Android release / AAB local | Réussi, signature de test uniquement |
| Installation USB | Réussie |
| Assets Play | Six captures 1080 × 1920, icône et visuel préparés |
| Manifeste release | Permissions stockage/biométrie superflues absentes, sauvegarde désactivée, Bluetooth historique limité à API 30, scan `neverForLocation`, matériel facultatif, service BLE non exporté ; aucune localisation en arrière-plan |
| Prebuild EAS propre | Réussi depuis `prebuild --clean` : plugin de durcissement appliqué, stockage hérité retiré, fonctions Bluetooth facultatives, service BLE `connectedDevice` présent et `LocationTaskService` absent du manifeste fusionné |
| Garde de signature | L'AAB QA `CN=Android Debug` est refusé avec le code 2 ; un AAB de production non Debug est requis |
| Scénarios Maestro | Écrits, exécution à faire dès installation de Maestro |
| Mise en page à 200 % | Parcours critique contrôlé sur émulateur : accueil, SOS, guides, carte, relais, dossier et RCP sans action inaccessible |
| Consentement météo | Bamako par défaut, divulgation Open-Meteo et parcours à 200 % validés sur émulateur ; position précise seulement après action dédiée |
| Effacement local | Double confirmation, `secure_delete`, checkpoint WAL, `VACUUM`, retour onboarding et relance sur base vide validés sur émulateur |
| RCP longue durée | Session propre de 5 min 08 s : 567 impulsions, cadence exacte à 110 BPM, aucun crash ; arrêt long et garde anti-redémarrage validés |
| Import/export V2 | Fichier invalide refusé, fichier valide confirmé puis stocké dans SQLCipher, partage `dossier-sos-mali.json` et QR local validés sur émulateur |
| Remplacement de dossier | Import atomique : ancien profil et anciens contacts supprimés ; clés étrangères réactivées à chaque ouverture, avec tests dédiés |
| Redémarrage hors ligne | Démarrage à froid en mode avion réussi ; accueil, météo en cache, guides locaux et liste Bamako disponibles sans crash |
| Captures Play | Contact sheet relue après la dernière correction ; six fichiers RGB 1080 × 1920 cohérents et sans alpha |
| Consentement Bluetooth depuis SOS | Validé sur build release API 32 : la divulgation complète et l'action de refus apparaissent avant le dialogue Android ; `BLUETOOTH_SCAN`, `CONNECT` et `ADVERTISE` restent refusées et aucun FGS n'existe avant « Autoriser et diffuser » |
| Refus d'autorisation Bluetooth | Validé sur build release API 32 : refus non bloquant, explication en langage simple, appels/SMS toujours disponibles et bouton direct vers les réglages Android |
| Photo de dossier sans accès global | Validé sur build release API 32 : `DocumentsUI/PickActivity` s'ouvre depuis le dossier alors que `READ_EXTERNAL_STORAGE`, `WRITE_EXTERNAL_STORAGE` et `READ_MEDIA_IMAGES` ne sont pas demandées |
| Contrôle assets Play | Dimensions, mode RGB, nombre de captures et copie courte validés ; le garde final refuse encore volontairement les coordonnées éditeur et la vidéo FGS absentes |

Les scénarios se trouvent dans `.maestro/`. Commande prévue :

```bash
maestro test .maestro
```

## Téléphone physique disponible

| Appareil | OS | Correctif sécurité | État |
| --- | --- | --- | --- |
| TECNO KL5 | Android 14 / API 34 | 1 juillet 2026 | APK 1.0.0 installé, cible API 36 |

## Tests physiques à exécuter

| Parcours | TECNO KL5 | Deuxième Android | Troisième Android |
| --- | --- | --- | --- |
| Premier démarrage / SQLCipher | Réussi : base ouverte, onboarding et relance | À faire | À faire |
| Appel 101 / 111 / 122, sans lancer l'appel réel | Réussi : médical 122, agression 101, alternatives 111/145 | À faire | À faire |
| SMS prérempli, mode avion puis GSM | Partiel : en mode avion, Google Messages s'ouvre avec les deux destinataires et aucun envoi automatique. Le contrôle visuel du corps et le second passage GSM restent à faire après configuration du numéro propriétaire dans Messages. | À faire | À faire |
| GPS accepté / refusé / indisponible | Réussi : position acceptée affichée sur le TECNO avec coordonnées et précision ; refus et indisponibilité gérés sans blocage | À faire | À faire |
| TalkBack + taille texte 200 % | Taille 200 % validée sur émulateur ; TalkBack reste à faire (service absent de l'émulateur) | À faire | À faire |
| RCP 110 BPM pendant 5 minutes | À faire | À faire | À faire |
| BLE scan + annonce GATT + notification d'arrêt | Scan retesté après redémarrage : HiOS renvoie encore `BluetoothLeScanner TimeoutException`, et l'interface affiche correctement le mode dégradé avec une action de reprise. Une alerte fraîche reste locale lorsque `BluetoothGattServer` expire ; aucun service ni notification de relais n'est alors lancé. Le message final a été contrôlé visuellement sur le TECNO : français lisible, sans préfixe Expo ni détail technique. | À faire | À faire |
| Relais BLE 3 sauts et anti-doublon | Bloqué : 3 appareils requis | À faire | À faire |
| Redémarrage / écran éteint / économie batterie | À faire | À faire | À faire |
| Import/export dossier V2 | À faire | À faire | — |
| Carte téléchargée puis mode avion | Bloqué : clé MapTiler requise | À faire | — |

## Critères bloquants avant mise en production

- zéro crash sur les trois scénarios automatisés et les parcours critiques manuels ;
- validation du stockage chiffré au redémarrage ;
- test BLE sur trois appareils réels, au moins trois sauts ;
- relecture médicale locale et validation bambara séparée ;
- clé cartographique de production restreinte ;
- identité juridique, contact support et URL publique de confidentialité ;
- AAB signé testé sur la piste interne Google Play.

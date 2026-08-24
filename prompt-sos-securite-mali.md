# MISSION — SOS Sécurité Mali (app premiers secours offline-first)

## Contexte

Construire une application mobile Expo destinée aux citoyens maliens, centrée sur les
premiers secours et l'alerte d'urgence. Contrairement aux apps existantes
(SOS-Sécurité de la DGPC, Numéros d'Urgence Mali), celle-ci doit fonctionner **sans
connexion internet fiable**, **sans compte utilisateur**, et apporter des fonctions
qu'aucune app malienne actuelle n'offre : fallback SMS, guidage vocal bilingue,
métronome RCP, relais SOS multi-hop en Bluetooth mesh, carte locale intégrée
(pharmacies/hôpitaux/police), météo cachée offline, et dossier médical local rattaché
à un numéro de téléphone.

C'est un projet à vocation d'utilité publique et une vraie app professionnelle, pas un
prototype — traite le soin porté au détail, à la fiabilité offline et à
l'accessibilité comme critères de réussite au même niveau que les fonctionnalités.
Le temps de développement n'est pas la contrainte principale ; la robustesse et la
qualité le sont.

**Inspirations étudiées (marché international) :**
- **Bridgefy** — relais de messages multi-hop en BLE, utilisé pendant les inondations
  de Houston et les mouvements sociaux à Hong Kong. Portée ~100m par saut, mais sauts
  illimités via chaîne d'utilisateurs.
- **HellixIT Beacon** — bascule hybride automatique internet ⇄ Bluetooth mesh,
  niveaux de gravité, anti-doublons cryptographique, filtrage par zone géographique.
- **ResQMesh** — classification embarquée des messages d'urgence sur mesh BLE, pensé
  pour zones sans infrastructure réseau.
- **American Red Cross First Aid** — contenu premiers secours entièrement préchargé,
  utilisable 100% offline.

Le principe retenu : reproduire la logique multi-hop de Bridgefy/Beacon mais
appliquée uniquement à des alertes SOS structurées (pas un chat généraliste), avec
pont automatique vers SMS/appel dès qu'un relais retrouve du réseau.

## Stack technique

- **Expo SDK dernière version stable**, TypeScript strict
- `expo-router` pour la navigation (file-based)
- `expo-location` — géolocalisation
- `expo-sms` — envoi SMS (fallback sans data)
- `expo-speech` — synthèse vocale FR (TTS natif du device)
- `expo-av` / `expo-audio` — lecture de fichiers audio pré-enregistrés (Bambara)
- `expo-sqlite` — stockage local structuré (profil, contacts, historique)
- `expo-task-manager` + `expo-background-task` — si nécessaire pour tâches en fond
- `react-native-ble-plx` — Bluetooth Low Energy, base du relais SOS multi-hop
  (nécessite **EAS Build / dev client**, incompatible avec Expo Go — le signaler
  clairement dans le README du projet)
- `@maplibre/maplibre-react-native` (ou `@rnmapbox/maps` en mode offline) — carte
  vectorielle locale avec tuiles téléchargées une fois (quand il y a du réseau) et
  mises en cache pour un usage 100% offline ensuite
- Cache HTTP simple (fetch + stockage local horodaté) pour la météo — pas de
  bibliothèque dédiée nécessaire, juste un fetch conditionnel + fallback sur la
  dernière donnée connue
- Pas de backend applicatif, pas d'auth, pas de compte au sens classique. Le numéro
  de téléphone sert d'identifiant local pour le dossier médical (voir section
  dédiée), mais il n'y a ni serveur ni mot de passe ni connexion réseau requise pour
  l'utiliser. 100% des données restent sur l'appareil sauf ce que l'utilisateur
  choisit explicitement de transmettre (SOS, SMS, relais mesh).

⚠️ **Contraintes techniques à respecter dès le départ :**
- Le module BLE oblige à sortir d'Expo Go → configurer `expo-dev-client` + EAS Build
  dès l'initialisation du projet, pas en fin de course.
- `expo-sms` ouvre l'app SMS native avec le message pré-rempli ; sur iOS/Android
  l'utilisateur doit confirmer l'envoi lui-même (pas d'envoi silencieux possible sans
  permissions système spéciales). Concevoir le flow SOS pour que cette confirmation
  soit un tap unique, pas une friction.
- `expo-speech` utilise le moteur TTS du système : le bambara n'est **pas** disponible
  nativement sur la quasi-totalité des appareils. Solution retenue : audio
  pré-enregistré (fichiers `.mp3`) pour le bambara, TTS natif pour le français. Prévoir
  dans l'architecture un dossier `assets/audio/bambara/` avec un fichier par étape de
  chaque guide, et un mapping `stepId → audioFile`. Si les fichiers audio ne sont pas
  encore disponibles, générer la structure + des placeholders clairement identifiés
  (ne pas laisser croire que le bambara est fonctionnel s'il ne l'est pas).
- **Carte offline** : les tuiles vectorielles doivent être téléchargées et mises en
  cache disque la première fois que l'app a du réseau (écran "télécharger la carte de
  ma région" explicite, avec taille estimée affichée). Sans ce téléchargement
  préalable, prévoir un mode dégradé en liste triée par distance (comme avant), pas un
  écran blanc.
- **Météo** : ce n'est pas une donnée offline par nature (elle change). Implémenter en
  hybride : fetch quand le réseau est là, cache local avec horodatage "dernière mise à
  jour il y a Xh", affichage clair de la donnée en cache si offline plutôt que de
  prétendre à du temps réel. Ne jamais bloquer l'app si l'appel météo échoue.

## Fonctionnalités V1 (full-featured)

### 1. Bouton SOS
- Bouton unique, très visible, accessible dès l'ouverture de l'app (écran d'accueil).
- Appui déclenche : capture géoloc → sélection rapide du type d'urgence (médical,
  accident, agression, incendie, noyade, autre) → deux actions simultanées proposées :
  - **Appel direct** vers le numéro pertinent (101 Police, 111 Gendarmerie, 122
    Protection civile, etc. — voir liste complète ci-dessous)
  - **SMS pré-rempli** avec position GPS (lien Google Maps `geo:` + coordonnées brutes
    en texte, car un lien cliquable ne fonctionne pas partout) vers un ou plusieurs
    contacts d'urgence enregistrés localement
- Fonctionne même sans data : le SMS est le canal de secours si la géoloc réseau
  échoue ou si l'utilisateur n'a pas de forfait data.

### 2. Dossier médical local, rattaché au numéro de téléphone (pas de compte)
- Pas de login/mot de passe. À la première ouverture, l'utilisateur saisit juste son
  numéro de téléphone (identifiant local, pas d'envoi réseau, pas de vérification par
  SMS/OTP) — c'est ce qui permet de le retrouver/exporter, y compris si l'app est
  réinstallée sur un autre appareil (export/import manuel du dossier, voir plus bas).
- Champs : nom, groupe sanguin, allergies, traitements en cours, antécédents notables,
  contacts d'urgence (nom + numéro), photo optionnelle.
- Écran accessible en 1 tap depuis l'accueil, sans déverrouiller le reste de l'app si
  techniquement possible (widget/écran de garde).
- **Attaché à l'alerte SOS** : en cas de déclenchement SOS, l'utilisateur peut choisir
  d'inclure automatiquement groupe sanguin + allergies + contacts dans le message
  SMS/relais mesh, pour que le premier secouriste sur place ait l'info vitale sans
  avoir à déverrouiller le téléphone de la victime.
- Export/partage du dossier en local (QR code ou fichier partageable via Bluetooth/
  SMS) pour le transférer facilement si la personne change de téléphone — toujours
  sans serveur central.
- Aucune donnée ne quitte l'appareil sauf action explicite de l'utilisateur (SOS, SMS,
  export, partage QR).

### 3. Guides premiers secours offline
Contenu embarqué en JSON local (pas de fetch réseau), structuré par scénario :
PLS, hémorragie, brûlure, étouffement (Heimlich), morsure de serpent, malaise
cardiaque, RCP, noyade, électrocution, fracture.
- Chaque guide = liste d'étapes, chacune avec : texte FR, illustration/icône, durée
  suggérée, référence audio (FR via TTS, Bambara via fichier pré-enregistré).
- **Guidage vocal mains-libres** : mode "lecture guidée" qui égrène les étapes à voix
  haute automatiquement, avec un bouton "étape suivante" en gros format pour ne pas
  avoir à lire l'écran en pleine action.
- Sélecteur de langue FR/Bambara persistant (stocké en local).

### 4. Métronome RCP
- Écran dédié : bouton "Démarrer RCP" → bip sonore + vibration haptique à 110 bpm
  (dans la fourchette recommandée 100-120/min), compteur de compressions à l'écran,
  rappel visuel du geste (profondeur, position des mains).
- Doit continuer à fonctionner écran allumé en tâche de premier plan, résister à un
  appui accidentel.

### 5. Relais SOS multi-hop (Bluetooth mesh, inspiré Bridgefy/Beacon)
- Chaque appareil avec l'app ouverte (ou en tâche de fond si autorisé) agit comme
  **émetteur ET relais** — pas juste détecteur de proximité directe.
- Une alerte SOS émise porte un paquet structuré, sans donnée personnelle
  identifiante par défaut :
  `{ id_message (uuid), type_urgence, position_gps, horodatage, ttl_sauts_restants,
  niveau_gravité, [dossier_médical_résumé si opt-in] }`
- **Multi-hop réel** : un appareil qui reçoit l'alerte et n'est pas la cible la
  retransmet automatiquement aux appareils à sa portée (BLE, ~30-100m selon
  environnement), jusqu'à épuisement du TTL — permettant à une alerte de traverser
  un quartier entier même sans qu'aucun maillon individuel n'ait de connexion
  internet.
- **Anti-doublon** : chaque appareil garde en mémoire courte les `id_message` déjà vus
  pour ne pas relayer en boucle (dédoublonnage, comme Beacon).
- **Pont hybride online/offline** : si un appareil relais retrouve du réseau data ou
  GSM à un moment de la chaîne, il peut automatiquement transmettre l'alerte plus loin
  par SMS/appel vers un service ou contact configuré — pont entre monde mesh et monde
  connecté, exactement le principe qui manque aux apps maliennes actuelles.
- Utilisateurs formés aux premiers secours peuvent s'enregistrer comme "secouriste
  disponible" (flag local, pseudo optionnel) pour être notifiés en priorité s'ils sont
  dans la chaîne de relais d'une alerte à proximité immédiate.
- Niveaux de gravité (faible/moyen/élevé/critique) pour prioriser l'affichage et le
  relais.
- **Partie la plus exigeante techniquement du projet** — prévoir dans le code des
  commentaires clairs sur : gestion de la portée BLE variable, consommation batterie
  du scan/relais permanent, permissions BLE Android 12+/iOS, comportement en
  background limité par l'OS. Toujours proposer un mode dégradé explicite (liste
  d'alertes reçues sans relais actif) si le Bluetooth est désactivé ou l'OS restreint
  l'exécution en fond.

### 6. Annuaire numéros d'urgence Mali (statique, offline)
- 101 Police Nationale, 111 Gendarmerie Nationale, 122 Protection Civile
  (Pompiers/Secours), 133 SEPLAPC, 135 Office Central des Stupéfiants, 144 Centre de
  Coordination et Gestion de Crise, 145 Garde Nationale.
- Appel en un tap, avec confirmation.

### 7. Carte locale intégrée — pharmacies, hôpitaux, police
- Vraie carte interactive (MapLibre, tuiles vectorielles téléchargées une fois puis
  mises en cache offline) avec pins pour : hôpitaux/centres de santé, pharmacies (avec
  indication garde/normale si la donnée est disponible), commissariats de police,
  casernes de gendarmerie.
- Données embarquées en JSON (liste statique enrichissable) : nom, catégorie,
  coordonnées, téléphone si connu, horaires.
- Filtrage par catégorie, tri par distance, calcul d'itinéraire simple (ligne droite +
  distance, ou itinéraire routier si les tuiles offline le permettent).
- Fallback en liste triée par distance si la carte n'a pas été téléchargée ou si
  l'affichage carte échoue — jamais d'écran bloquant.

### 8. Météo (hybride online/cache offline)
- Écran météo simple : conditions actuelles + prévisions courtes, alertes fortes
  pluies/inondations pertinentes pour le Mali (saison des pluies).
- Fetch quand le réseau est disponible, mise en cache locale avec horodatage visible
  ("dernière mise à jour : il y a 3h").
- Sert aussi de contexte pour les urgences liées aux intempéries (inondation,
  orage) — peut suggérer un lien vers le guide premiers secours pertinent.

## Design

- Palette sombre avec rouge/orange d'alerte, fort contraste, lisible en plein soleil.
- Gros boutons, zones tactiles larges (usage en situation de stress, une main).
- Typographie très lisible, tailles de police généreuses.
- Aucun élément qui ressemble à une pub ou à une notification non essentielle.
- Accessibilité : support VoiceOver/TalkBack, tailles de texte adaptatives.

## Architecture des données locales

```
/assets/data/emergency-numbers.json
/assets/data/health-facilities.json      (hôpitaux, centres de santé, pharmacies)
/assets/data/police-stations.json
/assets/data/first-aid-guides.json       (FR : texte + réf audio par étape)
/assets/audio/bambara/{guideId}/{stepId}.mp3
/cache/map-tiles/                        (tuiles vectorielles téléchargées offline)
/cache/weather.json                      (dernière donnée météo + horodatage)
/local-db (expo-sqlite) :
  - user_profile (numéro de téléphone comme clé locale, infos médicales)
  - emergency_contacts
  - rescuer_opt_in
  - mesh_seen_messages (dédoublonnage relais SOS, purge périodique)
  - sos_history (historique local des alertes envoyées/reçues)
```

## Livrables attendus de Claude Code

1. Projet Expo initialisé avec `expo-dev-client`, config EAS Build prête (BLE + carte
   offline obligent).
2. Navigation complète (`expo-router`) : Accueil/SOS, Dossier médical, Guides,
   Métronome RCP, Relais SOS mesh, Annuaire, Carte (santé/police), Météo, Paramètres
   (langue, contacts d'urgence, téléchargement carte offline).
3. Toutes les fonctionnalités listées ci-dessus implémentées et fonctionnelles
   offline (sauf appel/SMS/météo qui nécessitent un réseau GSM/data par nature, avec
   fallback propre dans chaque cas).
4. README expliquant clairement : comment builder (EAS, pas Expo Go), les
   limitations connues (Bambara TTS = fichiers audio à fournir, portée BLE, carte à
   télécharger avant usage offline), et les permissions requises (localisation,
   Bluetooth, SMS, contacts, stockage).
5. Code structuré, typé, commenté aux endroits sensibles (BLE mesh, dédoublonnage,
   fallback SMS, cache carte/météo).
6. Suite de tests de base pour la logique critique : dédoublonnage des messages mesh,
   décrémentation du TTL, formatage du SMS de géolocalisation.

## Critères de succès

- Utilisable de bout en bout sans jamais se connecter à internet, hors : appel/SMS
  (réseau GSM requis par nature), premier téléchargement des tuiles de carte, et
  actualisation météo.
- Aucune donnée personnelle transmise à un serveur central (il n'y en a pas) ; le
  numéro de téléphone ne sert que d'identifiant local et de clé d'export, jamais
  envoyé sans action explicite de l'utilisateur.
- Le bouton SOS est accessible en moins de 2 taps depuis n'importe quel écran.
- Une alerte SOS peut être relayée sur au moins 3 sauts consécutifs en conditions de
  test réelles (3 appareils physiques minimum), avec dédoublonnage vérifié.
- Le métronome RCP reste précis et stable pendant au moins 5 minutes d'utilisation
  continue.
- La carte reste utilisable en mode liste/dégradé si les tuiles offline n'ont pas été
  téléchargées.

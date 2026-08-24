# Matrice QA — SOS Sécurité Mali 1.0.0

Mise à jour : 10 août 2026. Publication visée : lundi 17 août 2026.

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

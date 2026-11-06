# Captures Google Play — plan V1

Format cible : PNG 24 bits, portrait 1080 × 1920 (9:16), sans transparence. Préparer sept
captures réelles de l’AAB ou d’un build identique, sans données personnelles :

1. Accueil — bouton SOS, état prêt et accès rapides.
2. SOS médical — choix du type, position refusée ou coordonnées de démonstration,
   appel 122 et SMS ; ne jamais afficher une position personnelle réelle.
3. Guides — liste des premiers secours et références documentées.
4. RCP — métronome actif à 110 BPM.
5. Carte/liste — lieux de Bamako avec horaires à confirmer.
6. Alertes proches — consentement Bluetooth ou radar actif sans alerte réelle.
7. Guide vocal — première étape de RCP avec la voix IA française en cours de lecture.

Alt text proposé :

1. « Accueil clair avec grand bouton rouge SOS et accès rapides. »
2. « Écran SOS médical proposant le 122, la position et un SMS. »
3. « Liste de dix guides de premiers secours disponibles à tout moment. »
4. « Métronome RCP affichant 110 battements par minute et le compteur. »
5. « Liste des hôpitaux, pharmacies et commissariats utiles à Bamako. »
6. « Consentement aux alertes proches avec actions d'activation et de refus. »
7. « Première étape de réanimation avec la voix IA française en cours de lecture. »

Contrôles avant export : batterie/réseau propres, aucune notification, aucune barre
de développement Expo, aucune clé API, aucun nom/numéro réel, UI strictement identique
à la version soumise. Google exige au moins deux captures ; quatre captures téléphone
1080p ou plus sont recommandées pour les emplacements de découverte.

## Statut du 6 novembre 2026

Les sept captures ont été reprises sur l’**APK EAS preview signé 1.0.0, code 5**,
en natif Android, sur un émulateur Android 12L/API 32 isolé, résolution 1080 × 1920.
Export PNG RGB sans transparence, aucune donnée personnelle, aucun rendu web ou
écran Expo. La carte/liste indique explicitement les distances depuis le centre
de Bamako. Le consentement Bluetooth conserve « Pas maintenant » ; aucune
activité Bluetooth n’est simulée dans cette capture.

Les sept images ont été relues en planche contact puis importées dans Play,
dans l’ordre 01 à 07. La fiche complète est enregistrée et indiquée « Prête à être
envoyée pour examen ». Le visuel 1024 × 500 et son SVG ont été refaits dans
l’identité actuelle ; l’icône 512 d’origine est conservée. Le visuel de présentation
créé avec assistance IA est déclaré comme tel dans la console ; les captures sont
des captures natives réelles. Les empreintes sont dans `store-assets/CHECKSUMS.sha256`.

## App Store — plan V1

Apple accepte de 1 à 10 captures PNG/JPEG sans transparence et redimensionne le jeu
haute résolution vers les formats plus petits. Comme la V1 déclare aussi l'iPad,
préparer deux séries réelles de sept captures :

- iPhone 6,9 pouces : iPhone 17 Pro Max, 1320 × 2868 recommandé ;
- iPad 13 pouces : iPad Pro 13 pouces, 2064 × 2752.

L'ordre est : accueil, SOS médical, guides, RCP, carte/liste, écoute Bluetooth,
guide vocal en lecture.
Sur iOS, ne jamais employer « diffusion multi-saut » : la V1 écoute au premier plan
mais ne réannonce pas les alertes BLE. Les fichiers seront placés dans
`store-assets/ios/iphone-6.9/` et `store-assets/ios/ipad-13/`, puis contrôlés avec
`npm run verify:ios-assets`.

Le 10 août 2026, la configuration iOS a été durcie et le prebuild propre validé.
Les captures restent à produire : Xcode 26.6 requiert le runtime iOS 26.5, tandis
que seuls les runtimes 26.1 et 26.2 sont actuellement installés.

Références Apple vérifiées le 10 août 2026 :

- https://developer.apple.com/help/app-store-connect/reference/app-information/screenshot-specifications/
- https://developer.apple.com/help/app-store-connect/manage-app-information/upload-app-previews-and-screenshots/

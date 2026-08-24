# Google Play — Data safety (brouillon conservateur)

Éditeur : **SahelPay Technologies** · support@sahelpay.ml · application **gratuite**.  
À reporter dans Play Console après vérification de l’AAB final et des SDK réellement
embarqués. Ce document n’est pas un avis juridique.

## Sécurité générale

- Données chiffrées en transit : **Oui** pour Open-Meteo et MapTiler (HTTPS).
- Données locales chiffrées : **Oui**, SQLCipher ; clé dans Android Keystore via
  SecureStore.
- Suppression : **Oui**, action « Effacer toutes mes données » dans l’app.
- Compte utilisateur : **Aucun**, donc aucune procédure de suppression de compte.
- Publicité / analytics / profilage : **Aucun**.

## Données qui restent uniquement sur l’appareil

Ces données ne sont pas envoyées au développeur : nom, numéro local, photo choisie,
groupe sanguin, allergies, traitements, antécédents, contacts, préférences,
historique SOS, clés cryptographiques et messages BLE reçus.

L’utilisateur peut toutefois initier lui-même un partage par QR, fichier ou SMS. Ces
transferts doivent rester décrits dans la politique de confidentialité, même si le
formulaire Data safety peut traiter certains partages explicitement initiés comme
des exceptions. Ne pas cocher l’exception sans relire l’aide affichée dans Play
Console au moment de la soumission.

## Données transmises à des services tiers

| Type Play | Destination | Finalité | Obligatoire ? | Conservation par l’app / fournisseur |
| --- | --- | --- | --- | --- |
| Localisation précise | Open-Meteo | Fournir la météo locale après consentement météo séparé | Facultatif | Prévision en cache SQLite ; position précise en mémoire vive. Open-Meteo indique que ses journaux techniques contenant éventuellement les coordonnées sont supprimés après 90 jours. |
| Identifiant d'appareil ou autre identifiant (adresse IP, choix conservateur) | Open-Meteo | Connexion, fonctionnalité météo et prévention des abus | Automatique lorsqu'une météo réseau est actualisée | Non conservé par l'app ; journaux Open-Meteo annoncés à 90 jours. |
| Identifiant d'appareil ou autre identifiant (adresse IP, choix conservateur) | MapTiler / CDN | Affichage cartographique et sécurité du service | Facultatif, seulement si la carte en ligne est configurée et ouverte | Non conservé par l'app ; le CDN indique une conservation en mémoire limitée à 20 minutes pour les contrôles de sécurité. |
| Zone cartographique consultée | MapTiler | Afficher les tuiles demandées | Facultatif | Pack hors ligne local si l'utilisateur déclenche son téléchargement. |

Réponse conservatrice proposée pour la localisation : **collectée**, finalité
« fonctionnalité de l’app », traitement facultatif. Pour « partagée », vérifier
dans le contrat du compte éditeur si Open-Meteo et MapTiler remplissent bien
l'exception Google « fournisseur de service ». À défaut de preuve contractuelle,
répondre **Oui** par prudence. Appliquer la même règle à l'adresse IP.

Ne pas cocher « traitement éphémère » pour Open-Meteo : sa politique publiée
annonce des journaux techniques pouvant contenir les coordonnées pendant 90 jours.

## SDK tiers à déclarer dans l’audit

- Expo / React Native : infrastructure applicative, aucun analytics ajouté.
- Open-Meteo : météo, requête HTTPS avec latitude/longitude.
- MapTiler : style et tuiles cartographiques, requêtes HTTPS.
- MapLibre : moteur de rendu local, télémétrie non utilisée.
- Android SMS / téléphone / partage : intents système déclenchés par l’utilisateur.

## Vérification finale

- inspecter l’AAB avec App Bundle Explorer ;
- contrôler l’absence de Firebase Analytics, Crashlytics et SDK publicitaire ;
- comparer chaque permission du manifeste avec la notice intégrée ;
- mettre à jour ce fichier si un SDK ou un fournisseur change.

Références fournisseurs vérifiées le 10 août 2026 :

- https://open-meteo.com/en/terms
- https://www.maptiler.com/privacy-policy
- https://docs.maptiler.com/guides/maps-apis/maps-platform/personal-data-in-maptiler-cloud/

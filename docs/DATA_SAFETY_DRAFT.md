# Google Play — Data safety (déclaration du 6 novembre, correction renvoyée le 11 novembre 2026)

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

## Réponses enregistrées dans Play Console le 6 novembre 2026

- Position **approximative et exacte** : collectée et partagée, facultative,
  finalité fonctionnement de l’app, traitement non éphémère. La position peut être
  approximative selon le choix Android ; la zone des tuiles révèle une zone consultée.
- ID de l’appareil ou autres ID (adresse IP, déclaration conservatrice) : collectés
  et partagés, requis lors des requêtes réseau météo automatiques, fonctionnement
  de l’app, traitement non éphémère. Aucun identifiant publicitaire ajouté.
- Aucun compte ni connexion ; aucune publicité ni analytics.
- Chiffrement en transit pour les données collectées par les fournisseurs HTTPS.
- Lien de demande de suppression déclaré à cette date : politique publique, sections effacement local
  et contact support. Les transferts SMS / BLE / export sont déclenchés par
  l’utilisateur et décrits séparément dans la politique.

Cette déclaration conservatrice ne présume pas d’une exception contractuelle
« fournisseur de service » pour Open-Meteo ou MapTiler. Les données médicales
restent uniquement locales tant que l’utilisateur n’initie pas un partage.

## Correction après le refus du 11 novembre 2026

La nouvelle URL de demande de suppression enregistrée dans la Console est
**https://www.sahelpay.ml/apps/sos-securite-mali/delete-data**. Elle est distincte
de l'URL de confidentialité,
**https://www.sahelpay.ml/apps/sos-securite-mali/privacy**.

La page dédiée présente explicitement **Nafalan — SOS & secours**, le package
`ml.sossecurite.app`, le compte de publication **MHM Digital Agency** et l'éditeur
**SahelPay Technologies**. Elle indique les étapes réelles d'effacement local et
les contacts de demande, sans promettre une suppression distante du dossier
médical conservé uniquement sur le téléphone.

**Renvoi enregistré le 11 novembre 2026 à 12:21 UTC**. À 12:24 UTC, les contrôles
automatiques sont terminés et la Console affiche « Vos modifications sont en
cours d'examen ». Aucune approbation ni publication publique n'est confirmée.
La page publique a été vérifiée dans le navigateur après le déploiement de production.
Les autres réponses concernant les flux, fournisseurs et données locales ne sont
pas modifiées. Voir [le dossier du refus](GOOGLE_PLAY_REFUSAL_2026_11_11.md).

# Politique de confidentialité — SOS Sécurité Mali

**Version 1.0 — 17 août 2026**  
**Source de publication :** `store-assets/privacy-policy.html`  
**URL publique prévue :** https://sahelpay.ml/apps/sos-securite-mali/privacy

## Éditeur

- **SahelPay Technologies**
- Représentant : **Abdoulaye NIANGALY**
- Bamako, République du Mali
- Site : https://sahelpay.ml
- Support : support@sahelpay.ml
- Confidentialité : privacy@sahelpay.ml
- Application **gratuite**, sans publicité, sans compte

## Plateformes

Android et iOS (`ml.sossecurite.app`).

## Données traitées

L’application peut traiter localement le nom, le numéro de téléphone, les
contacts d’urgence, le groupe sanguin, les allergies, les traitements, les
antécédents, une photo facultative, la position et l’historique des alertes.

La base locale est chiffrée avec SQLCipher. Sa clé est conservée dans le stockage
sécurisé du système (Android Keystore / iOS Keychain). Aucun compte utilisateur
n’est créé et SahelPay Technologies ne dispose pas d’un serveur central recevant
le dossier médical.

## Communications déclenchées par l’utilisateur

- L’appel ouvre l’application Téléphone après confirmation.
- Le SMS ouvre le composeur natif avec le message et les destinataires choisis.
- Un export QR ou JSON est produit uniquement après une action explicite.
- Le relais BLE diffuse aux appareils voisins le type d’urgence, la position,
  l’heure et un identifiant anonyme. La V1 ne diffuse aucune donnée médicale.

## Services externes

La météo utilise Bamako par défaut et peut l'actualiser automatiquement. Après
activation séparée de l'option « Utiliser ma position pour la météo », les
coordonnées précises nécessaires à la prévision sont transmises à Open-Meteo quand
cet écran est ouvert ou actualisé. Open-Meteo reçoit aussi l'adresse IP et indique
que ses journaux techniques peuvent contenir les coordonnées demandées pendant
90 jours. Si la carte en ligne est configurée et ouverte, MapTiler et son réseau de
diffusion reçoivent l'adresse IP ainsi que la zone et les tuiles demandées. Ces
requêtes HTTPS ne contiennent jamais le dossier médical.

## Conservation et contrôle

Les données sont conservées sur le téléphone jusqu’à leur suppression par
l’utilisateur ou la désinstallation. L’écran Confidentialité permet d’effacer le
dossier, les contacts, les préférences et l’historique. Les identifiants de
messages BLE déjà vus sont purgés automatiquement.

## Base légale et droits

Le traitement repose sur l’action et le consentement explicites de l’utilisateur.
Les droits d’accès, de correction, d’export et de suppression sont disponibles
dans l’application. Contact : privacy@sahelpay.ml — législation malienne
n°2013-015 modifiée.

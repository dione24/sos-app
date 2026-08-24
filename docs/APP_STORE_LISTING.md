# Fiche App Store (iOS) — SOS Sécurité Mali 1.0.0

## Identité

| Champ | Valeur |
| --- | --- |
| Nom | SOS Sécurité Mali |
| Sous-titre (30 car. max) | Urgences hors ligne Mali |
| Bundle ID | `ml.sossecurite.app` |
| SKU | `sos-securite-mali-ios` |
| Catégorie principale | Médecine |
| Catégorie secondaire | Utilitaires (optionnel) |
| Prix | **Gratuit** |
| Publicité | Non |
| Achats intégrés | Non (V1) |
| Compte requis | Non |
| Âge | 17+ recommandé (contenu urgence / premiers secours) ou selon questionnaire Apple |
| Éditeur | SahelPay Technologies |
| Contact support | support@sahelpay.ml |
| URL marketing | https://sahelpay.ml |
| URL confidentialité | https://sahelpay.ml/apps/sos-securite-mali/privacy |
| Copyright | © 2026 SahelPay Technologies |

## Description (App Store)

SOS Sécurité Mali vous aide à agir pendant une urgence au Mali, même sans internet stable.

Application gratuite, sans compte et sans publicité, éditée par SahelPay Technologies.

• Appel rapide des numéros officiels (101, 111, 122…)  
• SMS d’urgence prérempli avec position GPS  
• Guides de premiers secours hors ligne  
• Métronome RCP à 110 BPM  
• Liste locale des lieux utiles à Bamako  
• Dossier médical local chiffré  
• Détection des alertes Bluetooth proches pendant l'utilisation  
• Météo locale avec cache et âge de la donnée  

Important : ce n’est pas un dispositif médical. En urgence, appelez les secours et suivez leurs consignes.

## Mots-clés (100 car. max, virgules)

urgence,secours,mali,sos,rcp,premiers secours,ambulance,bamako,hors ligne,sante

## Notes de version 1.0.0

Première version iOS : SOS, annuaire Mali, guides hors ligne, RCP, dossier local chiffré, météo et écoute Bluetooth de proximité.

## Confidentialité App Store Connect (labels)

Déclarer notamment :

- **Location** — facultative, pour SOS / carte / météo précise  
- **Contact Info** — uniquement sur l’appareil (dossier local), non collectée par le développeur  
- **Health & Fitness** (si demandé pour dossier médical local) — données sur l’appareil uniquement  
- **Product Interaction** / diagnostics : non utilisés en V1  

Cocher **Data Not Collected** pour les catégories réellement absentes (publicité, tracking, etc.).  
Les données du dossier médical ne sont **pas** envoyées aux serveurs de SahelPay.

## Export compliance

`ITSAppUsesNonExemptEncryption` / usesNonExemptEncryption : **false**  
(chiffrement standard iOS/HTTPS et SQLCipher local ; pas d’algorithme propriétaire exempté à déclarer en V1 — à revalider si le modèle crypto change).

## Capacités iOS spécifiques à tester

- Localisation « When In Use »  
- Bluetooth central au premier plan (détection des alertes proches, sans advertising iOS)  
- Photo library (photo dossier facultative)  
- SMS / Phone via apps système  
- Keep-awake pendant RCP et lecture de guide  

## Captures

Prévoir les deux jeux haute résolution exigés par la configuration actuelle :
iPhone 6,9 pouces et iPad 13 pouces. Utiliser accueil, SOS, guides, RCP,
carte/liste et écoute Bluetooth ; ne pas afficher de dossier médical réel. Voir
`docs/SCREENSHOT_PLAN.md`.

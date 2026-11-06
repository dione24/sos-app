# Saisie Play Console — SOS Sécurité Mali 1.0.0

Éditeur : **SahelPay Technologies** · Abdoulaye NIANGALY  
Support : **support@sahelpay.ml** · Site : **https://sahelpay.ml**

## Fiche principale

| Champ | Valeur à saisir |
| --- | --- |
| Nom | SOS Sécurité Mali |
| Langue par défaut | Français (fr-FR) |
| Type | Application |
| Catégorie | Médecine |
| Prix | **Gratuite** |
| Publicité | **Non** |
| Accès restreint | Non, aucun compte |
| Audience | 18 ans et plus ; ne pas cibler les enfants |
| Pays initial | Mali (étendre ensuite) |
| Adresse e-mail | **support@sahelpay.ml** |
| Site web | **https://sahelpay.ml** |
| URL confidentialité | **https://www.sahelpay.ml/apps/sos-securite-mali/privacy** |
| Package | `ml.sossecurite.app` |

La description courte, la description complète et les notes de version prêtes à
copier se trouvent dans `PLAY_STORE_LISTING.md`.

## Data safety — réponses conservatrices

Choisir **Oui** à « l'application collecte-t-elle ou partage-t-elle des données ? » :
une position facultative peut quitter l'appareil vers Open-Meteo après consentement
météo séparé, vers MapTiler sous forme de zone/tuiles demandées, ou vers un
destinataire explicitement choisi. Cette réponse évite de sous-déclarer un flux.

| Type | Collectée | Partagée | Finalité | Facultative | Traitement |
| --- | --- | --- | --- | --- | --- |
| Localisation approximative et précise | Oui | Oui si l'exception fournisseur de service n'est pas contractuellement démontrée | Fonctionnalité de l'app | Oui | HTTPS ; ne pas cocher éphémère pour Open-Meteo |
| Identifiant d'appareil ou autre (adresse IP, déclaration conservatrice) | Oui | Même règle fournisseur de service | Fonctionnalité de l'app | Non pour la météo Bamako actualisée automatiquement | HTTPS ; journaux gérés par les fournisseurs |

- Ne pas déclarer comme collectés par SahelPay le nom, le téléphone, la photo, les
  contacts ou le dossier médical : ils restent dans SQLCipher sur l'appareil.
- Ne pas déclarer d'analytics, publicité, personnalisation, marketing ou fraude :
  aucun SDK correspondant n'est intégré.
- « Données chiffrées en transit » : **Oui** pour les services internet. Le relais
  Bluetooth est un partage de proximité explicite et n'est pas présenté comme un
  canal internet chiffré.
- « Suppression » : l'app fournit une double confirmation « Effacer toutes mes
  données ». Aucun compte et aucun stockage serveur géré par l'éditeur.
- Ne pas cocher « traitement éphémère » pour les fournisseurs externes sans preuve
  contractuelle sur leurs journaux.

Détail : `DATA_SAFETY_DRAFT.md`.

## Déclaration des fonctionnalités de santé

Cocher :

- **Emergency and First Aid** ;
- **Healthcare Services and Management** ;
- **Medical Reference and Education**.

Ne pas cocher : dispositif médical, décision clinique, Health Connect, capteurs
corporels, recherche clinique, vente de médicaments ou télémédecine.

Justification à copier :

> SOS Sécurité Mali fournit des instructions générales de premiers secours, un
> métronome RCP, un annuaire d'urgence et un dossier médical facultatif stocké
> localement. L'application n'est pas un dispositif médical et ne diagnostique, ne
> traite, ne guérit ni ne prévient aucune affection. Pour tout conseil, diagnostic
> ou traitement, l'utilisateur doit consulter un professionnel de santé. Les données
> médicales restent chiffrées sur l'appareil sauf partage volontaire initié par
> l'utilisateur. Application gratuite éditée par SahelPay Technologies (support@sahelpay.ml).

## Déclarations complémentaires

- Contenu : aucune violence graphique, sexualité, jeu d'argent, drogue ou langage
  offensant ; répondre honnêtement aux questions liées aux urgences médicales.
- Publicité : aucune.
- Identifiant publicitaire : non utilisé.
- Application gratuite.

## Foreground service (Bluetooth)

Suivre `FOREGROUND_SERVICE_DECLARATION.md` et joindre la vidéo de démonstration
dans `store-assets/video/` après un test GATT réussi.

## Checklist technique avant envoi

1. Héberger `store-assets/privacy-policy.html` à l'URL ci-dessus.
2. Injecter `EXPO_PUBLIC_MAPTILER_KEY` (visibilité EAS sensitive ; User-Agent contenant `ml.sossecurite.app`).
3. `eas build --platform android --profile production`
4. `npm run verify:android-release -- <aab>`
5. `npm run verify:play-submission`
6. Piste interne ; promotion publique réservée au propriétaire après QA et validation clinique.

## État au 6 novembre 2026

Compte choisi explicitement par le propriétaire : **MHM Digital Agency**.
Application Play créée : ID `4975629932621694392`.
Canal de test interne : `4700776084224063532`.
Classification IARC enregistrée avec accord du propriétaire : PEGI 3,
ESRB Everyone, USK 12 ; présence d’interactions utilisateurs et partage de position.
La cible commerciale reste exclusivement **18 ans et plus**.
La fiche complète est enregistrée avec les textes, l’icône d’origine, le nouveau
visuel et les sept captures natives code 5 ordonnées. La release **1.0.0 (5)** est
**active et accessible aux testeurs internes** depuis le 6 novembre 2026, 11 h 25 UTC.
Elle est **non examinée**, sous le nom temporaire `ml.sossecurite.app (unreviewed)`.
Deux comptes propriétaires sont sélectionnés dans une liste SOS dédiée ; leurs
adresses restent dans la console, hors Git.

Lien d’inscription activé :
https://play.google.com/apps/internaltest/4700776084224063532

Les dix déclarations initiales sont traitées, y compris l’absence d’identifiant
publicitaire. Le formulaire FGS est apparu après ce premier déploiement :
« Transfert de données continu vers un appareil externe » et lien vidéo public
renseignés et enregistrés. Le préflight final indique 0 échec et 0 garde bloquante.
Aucune promotion publique ; la validation clinique et la QA physique restent
requises pour cette décision du propriétaire.

La fiche et les déclarations sont enregistrées mais pas encore examinées :
« Envoyer l’appli pour examen » reste désactivé tant que le parcours de publication
complet n’est pas engagé. Aucune release de production n’est créée pour contourner
cette étape ; le test interne est déjà actif et indépendant.

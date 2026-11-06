# Checklist publication — SOS Sécurité Mali 1.0.0

## Passage en production — 6 novembre 2026

Le propriétaire a expressément demandé le passage en production et la fusion de la
PR après le test interne. La version **1.0.0 (5)**, identique au bundle testé, a été
ajoutée au canal de production `4697930975691391093`, pour **le Mali**.
Les dix modifications (release, pays, fiche française et déclarations) ont été
envoyées : Play affiche « Modifications en cours d’examen », avec les vérifications
automatiques préalables encore en cours. La publication gérée est désactivée : le
déploiement complet est prévu après approbation Google. Cette soumission ne signifie
pas que l’app est déjà disponible publiquement.

La relecture médicale locale reste **non documentée**, et les limites de QA restent
celles de `QA_MATRIX.md`. Aucune signature clinique ni réussite de test non exécuté
n’est ajoutée. La demande actuelle remplace la consigne antérieure limitant cette
intervention au test interne et interdisant la fusion.


Éditeur : **SahelPay Technologies** · Abdoulaye NIANGALY  
App **gratuite** · Publication Android en cours le 6 novembre 2026 ; iOS hors de cette demande.

## Identité & légal

- [x] raison sociale : SahelPay Technologies ;
- [x] représentant : Abdoulaye NIANGALY ;
- [x] siège : Bamako, République du Mali ;
- [x] e-mail support : support@sahelpay.ml ;
- [x] e-mail confidentialité : privacy@sahelpay.ml ;
- [x] site : https://sahelpay.ml ;
- [x] politique HTML prête (`store-assets/privacy-policy.html`) ;
- [x] politique **mise en ligne** sur https://sahelpay.ml/apps/sos-securite-mali/privacy ;
- [x] app déclarée gratuite, sans publicité ;
- [x] bambara médical masqué en V1.

## Technique code

- [x] UX urgence P0/P1/P2 solidifiée ;
- [x] SQLCipher + SecureStore ;
- [x] consentements GPS / BLE / météo ;
- [x] TypeScript + 42 tests ;
- [x] constantes éditeur `src/constants/publisher.ts` ;
- [x] config iOS permissions + non-exempt encryption flag ;
- [x] iOS limité à localisation/Bluetooth au premier plan, sans Face ID, mouvement ni background modes ;
- [x] UI et fiche iOS corrigées : écoute BLE seulement, aucune réannonce multi-saut ;
- [x] profils EAS Android + iOS.

## Cartographie

- [x] clé MapTiler production créée ; restriction de requête User-Agent `ml.sossecurite.app` (pas une attestation du package) ;
- [x] `EXPO_PUBLIC_MAPTILER_KEY` injectée dans les environnements EAS production et preview, visibilité sensitive (valeur accessible au client compilé).

## Builds store

- [x] keystore / credentials Android production (EAS remote) ;
- [ ] certificats iOS / App Store Connect ;
- [x] AAB Android production non-Debug ;
- [ ] IPA / build iOS production ;
- [ ] runtime simulateur iOS 26.5 installé pour les captures ;
- [x] empreintes consignées dans `RELEASE_ARTIFACTS.md`.

## QA physique

- [ ] runbook `DEVICE_QA_RUNBOOK.md` Android ;
- [ ] runbook iPhone ;
- [ ] captures iPhone 6,9 pouces et iPad 13 pouces (`store-assets/ios/`) ;
- [ ] TalkBack / VoiceOver ;
- [ ] BLE multi-appareils (3 sauts) si multi-hop annoncé ;
- [x] vidéo FGS Bluetooth native code 5, hébergée publiquement, déclaration enregistrée dans Play.
- [x] validation MP4 automatique de la preuve FGS (`npm run verify:fgs-video`).

## Contenu médical

- [ ] relecture / validation locale signée (`MEDICAL_CONTENT_REVIEW.md`) ;
- [ ] disclaimer non-dispositif médical présent (déjà dans l’UI).

## Stores

### Google Play

- [x] app créée dans **MHM Digital Agency**, choix explicitement autorisé par le propriétaire ;
- [x] fiche `PLAY_STORE_LISTING.md` saisie, 7 captures natives code 5, nouveau visuel et icône conservée ;
- [x] Data safety + Health declaration ; classification IARC et cible adultes enregistrées ;
- [x] URL privacy live ;
- [x] piste interne **active**, version 1.0.0 (5), non examinée ; **production soumise sur demande du propriétaire**, approbation Google en attente.

### App Store

- [ ] compte Apple Developer ;
- [ ] fiche `APP_STORE_LISTING.md` saisie ;
- [ ] privacy labels ;
- [ ] TestFlight puis review ;
- [ ] URL privacy live (même que Play).

## Post-publication

- [ ] surveiller support@sahelpay.ml ;
- [ ] plan de correctif crash (EAS Update ou build 1.0.1) ;
- [ ] ne pas annoncer multi-hop « garanti » tant que non validé sur 3 appareils.

## Contrôle de publication du 6 novembre 2026

L’import Play des anciens artefacts a révélé des permissions GPS doublonnées.
Le plugin supprime désormais les déclarations `uses-permission-sdk-23` héritées
pendant la fusion Gradle via `tools:node="remove"`, en conservant une seule paire
GPS non limitée. Le manifeste fusionné Gradle et les deux artefacts finaux code 5
passent la vérification. Le code 4 a été annulé ; ne pas distribuer les anciens builds.

L’AAB **1.0.0 (5)** est diffusé dans la piste **interne active**, sans promotion
publique. Les deux testeurs propriétaires sont sélectionnés dans une liste SOS
dédiée. Le préflight final donne **0 échec technique, 0 garde de publication**.
La vidéo native est validée et publique, la déclaration FGS est enregistrée.
Le TECNO a exécuté les deux arrêts BLE et la vérification d’absence de rediffusion ;
ses réglages temporaires sont restaurés et vérifiés. La QA physique complète,
TalkBack, les essais sur trois appareils et la relecture clinique restent des
conditions séparées de la promotion publique.

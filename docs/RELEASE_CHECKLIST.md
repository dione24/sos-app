# Checklist publication — SOS Sécurité Mali 1.0.0

Éditeur : **SahelPay Technologies** · Abdoulaye NIANGALY  
App **gratuite** · Android + iOS

## Identité & légal

- [x] raison sociale : SahelPay Technologies ;
- [x] représentant : Abdoulaye NIANGALY ;
- [x] siège : Bamako, République du Mali ;
- [x] e-mail support : support@sahelpay.ml ;
- [x] e-mail confidentialité : privacy@sahelpay.ml ;
- [x] site : https://sahelpay.ml ;
- [x] politique HTML prête (`store-assets/privacy-policy.html`) ;
- [ ] politique **mise en ligne** sur https://sahelpay.ml/apps/sos-securite-mali/privacy ;
- [x] app déclarée gratuite, sans publicité ;
- [x] bambara médical masqué en V1.

## Technique code

- [x] UX urgence P0/P1/P2 solidifiée ;
- [x] SQLCipher + SecureStore ;
- [x] consentements GPS / BLE / météo ;
- [x] TypeScript + 39 tests ;
- [x] constantes éditeur `src/constants/publisher.ts` ;
- [x] config iOS permissions + non-exempt encryption flag ;
- [x] iOS limité à localisation/Bluetooth au premier plan, sans Face ID, mouvement ni background modes ;
- [x] UI et fiche iOS corrigées : écoute BLE seulement, aucune réannonce multi-saut ;
- [x] profils EAS Android + iOS.

## Cartographie

- [ ] clé MapTiler production créée et restreinte à `ml.sossecurite.app` (Android + iOS) ;
- [ ] `EXPO_PUBLIC_MAPTILER_KEY` injectée dans EAS secrets / env de build.

## Builds store

- [ ] keystore / credentials Android production (EAS remote) ;
- [ ] certificats iOS / App Store Connect ;
- [ ] AAB Android production non-Debug ;
- [ ] IPA / build iOS production ;
- [ ] runtime simulateur iOS 26.5 installé pour les captures ;
- [ ] empreintes consignées dans `RELEASE_ARTIFACTS.md`.

## QA physique

- [ ] runbook `DEVICE_QA_RUNBOOK.md` Android ;
- [ ] runbook iPhone ;
- [ ] captures iPhone 6,9 pouces et iPad 13 pouces (`store-assets/ios/`) ;
- [ ] TalkBack / VoiceOver ;
- [ ] BLE multi-appareils (3 sauts) si multi-hop annoncé ;
- [ ] vidéo FGS Bluetooth pour Play (Android).
- [x] validation MP4 automatique de la preuve FGS (`npm run verify:fgs-video`).

## Contenu médical

- [ ] relecture / validation locale signée (`MEDICAL_CONTENT_REVIEW.md`) ;
- [ ] disclaimer non-dispositif médical présent (déjà dans l’UI).

## Stores

### Google Play

- [ ] compte développeur + éventuelle période testeurs fermés ;
- [ ] fiche `PLAY_STORE_LISTING.md` saisie ;
- [ ] Data safety + Health declaration ;
- [ ] URL privacy live ;
- [ ] piste interne puis production.

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

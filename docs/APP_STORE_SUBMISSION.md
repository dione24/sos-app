# Soumission App Store Connect — SOS Sécurité Mali

Éditeur : **SahelPay Technologies** · Abdoulaye NIANGALY · support@sahelpay.ml

## Prérequis

1. Compte Apple Developer (organisation **SahelPay Technologies** si possible).
2. App ID / Bundle `ml.sossecurite.app` créé.
3. Politique en ligne : https://sahelpay.ml/apps/sos-securite-mali/privacy
4. Build EAS iOS production :

```bash
npx eas-cli@latest login
npx eas-cli@latest build --platform ios --profile production
```

5. Soumettre via :

```bash
npx eas-cli@latest submit --platform ios --profile production
```

## Fiche

Copier depuis `APP_STORE_LISTING.md` : nom, sous-titre, description, mots-clés,
URL support / marketing / privacy, notes de version.

## Prix

**Gratuit** — aucune publicité, aucun IAP en V1.

## Review notes (anglais recommandé pour les reviewers)

```
SOS Sécurité Mali is a free offline-first emergency and first-aid app for Mali.
No account, no ads, no backend for medical data. Medical profile stays encrypted
on device (SQLCipher). Phone/SMS open system apps after user confirmation.
On iOS, Bluetooth is foreground central scanning only; the app does not claim
background or peripheral advertising.
Support: support@sahelpay.ml
Privacy: https://sahelpay.ml/apps/sos-securite-mali/privacy
```

## Limites iOS à assumer en review

- La V1 iOS écoute les alertes BLE au premier plan ; elle ne les réannonce pas.
- Aucun mode Bluetooth ou localisation en arrière-plan n'est déclaré sur iOS.
- App remains usable for SOS call/SMS/guides without Bluetooth.

## Après approbation

- Activer TestFlight pour testeurs internes SahelPay.
- Rejouer `docs/DEVICE_QA_RUNBOOK.md` sur iPhone physique avant release publique.

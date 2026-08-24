# Éditeur — SOS Sécurité Mali

| Champ | Valeur |
| --- | --- |
| Raison sociale | **SahelPay Technologies** |
| Développeur / représentant | **Abdoulaye NIANGALY** |
| Siège | Bamako, République du Mali |
| Site web | https://sahelpay.ml |
| Support public | support@sahelpay.ml |
| Confidentialité | privacy@sahelpay.ml |
| Politique publique (URL à héberger) | https://sahelpay.ml/apps/sos-securite-mali/privacy |
| Application | SOS Sécurité Mali |
| Prix | **Gratuite** — aucune publicité, aucun achat intégré en V1 |
| Android package | `ml.sossecurite.app` |
| iOS bundle | `ml.sossecurite.app` |
| Plateformes V1 | Android (priorité publication) + iOS (même codebase Expo) |

## Fichiers synchronisés

- `src/constants/publisher.ts` — constantes runtime
- `store-assets/privacy-policy.html` — page à mettre en ligne sur sahelpay.ml
- `docs/PLAY_STORE_LISTING.md` / `docs/APP_STORE_LISTING.md`
- `docs/PLAY_CONSOLE_SUBMISSION.md` / `docs/APP_STORE_SUBMISSION.md`

## Hébergement de la politique

1. Publier `store-assets/privacy-policy.html` sous  
   `https://sahelpay.ml/apps/sos-securite-mali/privacy`  
   (ou équivalent stable HTTPS, non géobloqué, non PDF).
2. Vérifier l’URL sur un réseau mobile hors Wi‑Fi bureau.
3. Utiliser la **même URL** dans Google Play et App Store Connect.

## Adresse postale

La mention légale utilise **Bamako, République du Mali**.  
Si Play/Apple exigent une rue complète, la compléter dans Play Console / App Store Connect sans changer le domaine support.

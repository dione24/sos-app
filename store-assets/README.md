# Assets stores — SOS Sécurité Mali

Éditeur : **SahelPay Technologies** · Abdoulaye NIANGALY  
App **gratuite** · Android + iOS · `ml.sossecurite.app`

## Google Play

- `icon-512.png` : icône 512 × 512
- `feature-graphic-1024x500.png` : visuel 1024 × 500
- `screenshots/` : sept captures Android 1080 × 1920, dont la voix IA française en lecture
- `privacy-policy.html` : **prête à héberger** (coordonnées SahelPay intégrées)

URL publique à publier sur le site :

`https://sahelpay.ml/apps/sos-securite-mali/privacy`

Contrôle :

```bash
npm run verify:play-submission
```

## App Store

Captures haute résolution à produire depuis le build iOS soumis : iPhone 6,9 pouces
et, puisque la V1 prend en charge l'iPad, iPad 13 pouces. Le plan et les dimensions
officielles se trouvent dans `ios/README.md` et `docs/SCREENSHOT_PLAN.md`.

Contrôle :

```bash
npm run verify:ios-assets
```

## Vidéo Foreground Service (Android)

Obligatoire pour le service BLE `connectedDevice` :  
`docs/FOREGROUND_SERVICE_DECLARATION.md` → déposer dans `video/` après test GATT réussi.

## Support

- support@sahelpay.ml
- privacy@sahelpay.ml
- https://sahelpay.ml

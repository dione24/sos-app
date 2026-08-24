# Captures App Store

La V1 déclare iPhone et iPad. Apple accepte 1 à 10 captures par famille et
recommande de fournir uniquement la plus haute résolution lorsque l'interface est
identique.

À produire depuis le build iOS réellement soumis, sans donnée personnelle :

- `iphone-6.9/` : iPhone 17 Pro Max, idéalement 1320 × 2868 ;
- `ipad-13/` : iPad Pro 13 pouces, 2064 × 2752.

Ordre conseillé dans chaque dossier : accueil, SOS médical, guides, RCP,
carte/liste, écoute Bluetooth. Le dossier médical n'est pas affiché pour éviter
toute donnée personnelle dans les visuels marketing.

Contrôle final :

```bash
npm run verify:ios-assets
```

Référence Apple vérifiée le 10 août 2026 :
https://developer.apple.com/help/app-store-connect/reference/app-information/screenshot-specifications/

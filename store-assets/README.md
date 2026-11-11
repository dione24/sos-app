# Assets stores — Nafalan

Éditeur : **SahelPay Technologies** · Abdoulaye NIANGALY  
App **gratuite** · Android + iOS · `ml.sossecurite.app`

État du **11 novembre 2026** : APK final de recette **1.0.2 (8)** compilé et testé,
non publié et non soumis aux stores. Les parcours Android API 36, dont
l'effacement et l'absence de l'ancien dossier, ont réussi. Les huit captures
natives ont été renouvelées et contrôlées visuellement.
Le nom visible devient Nafalan ; les identifiants
techniques et les chemins compatibles gardent leur valeur historique.
Voir [le rapport 1.0.2](../docs/RELEASE_1.0.2.md) et
[la décision de nommage](../docs/NAMING_NAFALAN.md).

## Google Play

- `icon-512.png` : icône 512 × 512
- `feature-graphic-1024x500.png` : visuel 1024 × 500
- `screenshots/` : huit captures natives de l'APK final de recette 1.0.2 (8),
  Android API 36, PNG RGB 1080 × 1920, sans données personnelles. Le retrait du
  canal alpha entièrement opaque ne modifie aucun pixel visible.
- `privacy-policy.html` : version Nafalan préparée localement, **non déployée**.
  La publication et la vérification du 6 novembre concernaient la version
  historique, pas le contenu courant de ce fichier.

Adresse publique utilisée historiquement pour la politique :

`https://www.sahelpay.ml/apps/sos-securite-mali/privacy`

Son contenu en ligne n'a pas été revalidé comme version Nafalan dans cette
intervention. La présence du fichier local ne prouve pas son déploiement.

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

`video/foreground-service-connected-device.mp4` est conservée comme preuve
historique du **6 novembre 2026**, APK **1.0.0 (5)** sur TECNO KN4 / Android 16.
Elle ne valide pas les changements BLE/FGS du build 1.0.2 (8). Aucun relais BLE
entre téléphones physiques n'a été testé pour ce candidat.

La déclaration du service `connectedDevice` et les conditions de recette restent
documentées dans `docs/FOREGROUND_SERVICE_DECLARATION.md` et `video/README.md`.

## Support

- support@sahelpay.ml
- privacy@sahelpay.ml
- https://sahelpay.ml

Les résultats historiques des scripts et de la vidéo ne prouvent pas une
publication du candidat. Aucun AAB de production, upload Play ou fusion de la
branche 1.0.2 n'a été effectué à ce stade.

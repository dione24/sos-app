# Assets stores — Nafalan

Éditeur : **SahelPay Technologies** · Abdoulaye NIANGALY  
Application gratuite · Android + iOS · `ml.sossecurite.app`

État du **11 novembre 2026** : release **1.0.2 (8)** et huit captures rouges
ordonnées **envoyées dans une demande de production enregistrée vers 11:02 UTC**.
Vérifications automatiques Google terminées : version en cours d’examen.
Aucune approbation ni disponibilité publique confirmée.
Google accepte l'AAB et le mapping ReTrace ; déploiement 100 % enregistré vers
les pays existants (Mali).
Runtime `15bb5e5`, charte rouge `636fc72` et barre système adaptée au thème.
Les huit captures finales RGB et leurs empreintes sont en place ;
`verify:play-submission` passe.
Voir [le rapport de livraison](../docs/RELEASE_1.0.2.md),
[le reçu structuré](../docs/validation/nafalan-1.0.2-8.json) et
[la charte](../docs/design/DESIGN.md).

## Google Play

- `icon-512.png` : 512 × 512, RGB opaque, bouclier rouge et barres Mali conservées.
- `feature-graphic-1024x500.png` : 1024 × 500, RGB, famille rouge/neutre de la charte.
- `screenshots/` : huit captures claires de la charte finale, RGB, sans donnée
  personnelle, renouvelées après la purge QA et relues. Les anciennes captures
  API 36 de `5e548d1` ne sont plus le jeu retenu pour cette livraison.
- Deux vues sombres (accueil/guides) ont été relues pour la revue interne ; les
  icônes blanches de barre système ont été confirmées sur les captures. Les libellés d'onglets sont tronqués sur la configuration Tecno,
  sans nouveau défaut de métrique lié aux couleurs établi.
- `CHECKSUMS.sha256` : actualisé avec le jeu de visuels retenu.

## Politique de confidentialité

La politique **Nafalan avec CSS rouge est déployée**, revue dans le navigateur et
vérifiée en ligne. Source web :
[`3eadcac6ec7b740728bfa9ab8577d31b8e1628d0`](https://github.com/dione24/sahelpay-landing/commit/3eadcac6ec7b740728bfa9ab8577d31b8e1628d0).

[Politique publique](https://www.sahelpay.ml/apps/sos-securite-mali/privacy).
Le HTML local `privacy-policy.html` reste un artefact distinct du déploiement web ;
la modification de charte y touche uniquement le CSS, sans modifier texte ni date.

## Vidéos Bluetooth et service au premier plan

`video/foreground-service-connected-device.mp4` est la preuve historique du
**6 novembre 2026**, APK **1.0.0 (5)**. Elle ne valide pas le runtime courant.
La recette privée a confirmé Mac→Android : réception, validation, retransmission
et démarrage/arrêt du service observés dans l'interface et les états natifs.
La lecture retour du paquet par le Mac, l'acquittement radio du TTL 2→1 et deux
Android restent non validés. Aucun aller-retour complet ni plusieurs sauts réels
ne sont revendiqués. Les clips privés du harnais ne remplacent pas automatiquement
la vidéo publique de déclaration. Arrêt UI, automatique et nettoyage système
restent des résultats distincts. L'arrêt UI est qualifié par PNG et états natifs
avant/après ; les MP4 privés ne montrent pas une séquence STOP complète. La QA
a été désinstallée après la recette, sans modifier la production préexistante.

Les conditions de déclaration restent documentées dans
[FOREGROUND_SERVICE_DECLARATION.md](../docs/FOREGROUND_SERVICE_DECLARATION.md) et
[video/README.md](video/README.md).

## App Store et contrôles

La recette iOS n'est pas acquise. Les captures iPhone/iPad restent à produire
sur le build soumis selon [SCREENSHOT_PLAN.md](../docs/SCREENSHOT_PLAN.md).
Les contrôles locaux disponibles sont `npm run verify:play-submission`,
`npm run verify:ios-assets` et `npm run verify:fgs-video` ; ils ne prouvent pas
une soumission ou une approbation des stores.

## Livraison et support

La [PR #6](https://github.com/dione24/sos-app/pull/6) est fusionnée dans `main`
(`e52db5214d46c174c9704030ec10098f27b76749`). La demande de production de la
1.0.2 remplace celle de la 1.0.1 et est maintenant en cours d’examen Google. La disponibilité publique n'est pas confirmée. La console estime l'installation à 27,2 Mo (−11,9 Mo versus code 7) ;
cela ne mesure pas la vitesse sur téléphone.

- support@sahelpay.ml
- privacy@sahelpay.ml
- https://sahelpay.ml

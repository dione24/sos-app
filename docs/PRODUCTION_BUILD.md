# Builds de production — Android & iOS

Éditeur : **SahelPay Technologies** · Abdoulaye NIANGALY  
Package / Bundle : `ml.sossecurite.app`  
App **gratuite**.

## Variables d'environnement

```bash
# .env (ne pas committer la clé réelle)
EXPO_PUBLIC_MAPTILER_KEY=votre_cle_maptiler
```

Dans MapTiler Cloud, restreindre la clé au minimum à :

- Android package : `ml.sossecurite.app`
- iOS bundle : `ml.sossecurite.app`
- (optionnel) domaines web si prévisualisation)

## 1. Compte EAS

```bash
npx eas-cli@latest login
npx eas-cli@latest init   # si le projet n'est pas encore lié
```

## 2. Identifiants Android

```bash
npx eas-cli@latest credentials:configure-build -p android -e production
```

Générer une clé d'upload si besoin. Sauvegarder le keystore **hors dépôt**.

## 3. Identifiants iOS

```bash
npx eas-cli@latest credentials:configure-build -p ios -e production
```

Utiliser le compte Apple Developer SahelPay / Abdoulaye NIANGALY.  
Distribution : App Store Connect.

## 4. Builds

```bash
# Android App Bundle
npx eas-cli@latest build --platform android --profile production

# iOS (nécessite compte Apple Developer)
npx eas-cli@latest build --platform ios --profile production

# Les deux
npx eas-cli@latest build --platform all --profile production
```

## 5. Vérifications Android

```bash
npm run preflight:monday -- /chemin/vers/app.aab
```

Le préflight rejoue le typage, les tests, Expo Doctor, les manifestes Android/iOS,
les assets Play et la signature. Refuser toute signature `CN=Android Debug`.

## 6. Distribution

| Plateforme | Étape |
| --- | --- |
| Google Play | Piste **Test interne** → testeurs → production |
| Apple | **TestFlight** → review App Store |

Soumission assistée :

```bash
npx eas-cli@latest submit --platform android --profile production
npx eas-cli@latest submit --platform ios --profile production
```

## 7. Politique de confidentialité

Héberger avant toute soumission store :

- Fichier local : `store-assets/privacy-policy.html`
- URL : https://sahelpay.ml/apps/sos-securite-mali/privacy

## 8. Après build

1. Rejouer `DEVICE_QA_RUNBOOK.md` sur Android **et** iPhone.
2. Consigner empreintes dans `RELEASE_ARTIFACTS.md`.
3. Ne promouvoir en public qu'après validation clinique du contenu de premiers secours (voir `MEDICAL_CONTENT_REVIEW.md`).

## Références

- https://docs.expo.dev/build/introduction/
- https://docs.expo.dev/submit/introduction/
- https://docs.expo.dev/app-signing/app-credentials/

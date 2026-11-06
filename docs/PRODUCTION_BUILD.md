# Builds de production — Android & iOS

Éditeur : **SahelPay Technologies** · Abdoulaye NIANGALY  
Package / Bundle : `ml.sossecurite.app`  
App **gratuite**.

## Variables d'environnement

```bash
# .env (ne pas committer la clé réelle)
EXPO_PUBLIC_MAPTILER_KEY=votre_cle_maptiler
```

Projet EAS lié : `dione24/sos-securite-mali`, ID
`bdcf21f2-861a-460b-9036-c862ce4e4313`.

La clé est configurée dans EAS **production** et **preview**, avec visibilité
**sensitive**. Expo refuse la visibilité secret pour une variable `EXPO_PUBLIC_`,
car sa valeur sera accessible dans le client compilé.

MapTiler Cloud autorise les requêtes dont le **User-Agent contient
`ml.sossecurite.app`**. Il s’agit d’une restriction de requête, pas d’une attestation
cryptographique du package Android. Le client MapLibre ajoute ce User-Agent avant
tout chargement de carte ou pack hors ligne. Vérification : attendu 200 / autre 403.
Ne jamais committer la clé réelle, le keystore ni `credentials.json`.

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
| Google Play | Piste **Test interne** ; production après validation clinique et QA |
| Apple | **TestFlight** → review App Store |

Soumission assistée :

```bash
npx eas-cli@latest submit --platform android --profile production
npx eas-cli@latest submit --platform ios --profile production
```

## 7. Politique de confidentialité

Politique spécifique publiée et vérifiée le 6 novembre 2026 :

- Fichier local : `store-assets/privacy-policy.html`
- URL : https://www.sahelpay.ml/apps/sos-securite-mali/privacy

## 8. Après build

1. Rejouer `DEVICE_QA_RUNBOOK.md` sur Android **et** iPhone.
2. Consigner empreintes dans `RELEASE_ARTIFACTS.md`.
3. Ne promouvoir en public qu'après validation clinique du contenu de premiers secours (voir `MEDICAL_CONTENT_REVIEW.md`).

## Références

- https://docs.expo.dev/build/introduction/
- https://docs.expo.dev/submit/introduction/
- https://docs.expo.dev/app-signing/app-credentials/

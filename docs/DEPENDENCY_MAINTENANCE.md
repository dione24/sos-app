# Maintenance des dépendances — Expo SDK 57

État vérifié le **11 novembre 2026**. Expo **57.0.32**, Router **57.0.30**,
React Native **0.86.3** et les modules natifs existants gardent leurs versions.
Les correctifs ciblés sont verrouillés dans `package-lock.json` ; aucun
`npm audit fix --force`, `--force` ou `--legacy-peer-deps` n'a été utilisé.

| Élément | Version retenue | Usage |
| --- | --- | --- |
| decode-uri-component | **0.5.1** | Override sous query-string 7.1.3, décodeur runtime local |
| image-size | **2.0.3** | Override sous Metro, analyse des assets au build |
| glob / minimatch | **14.0.4 / 11.0.5** | Overrides sous fingerprint, outillage Node |
| patch-package | **8.0.1** | Dépendance de production pour le postinstall des builds |
| expo-build-properties | **57.0.23** | Plugin SDK 57 pour minification R8 et réduction des ressources |
| Vitest / mocker | **4.1.12** | Tests de développement |
| Vite | **8.3.8** | Dépendance de développement de Vitest |

## Pourquoi conserver le patch CJS

**0.5.0 reste vulnérable au second déni de service** ; le correctif retenu est
[0.5.1, selon l'avis du mainteneur](https://github.com/SamVerschueren/decode-uri-component/security/advisories/GHSA-qr28-fpjm-wq7f).
Cette version est ESM, alors que query-string 7 attend une fonction CommonJS.
Un remplacement par query-string 9 casse aussi les imports nommés de Router 57.

[Le patch](../patches/decode-uri-component+0.5.1.patch) change exactement deux
lignes de packaging : `export default function` → `module.exports = function`,
et `type: module` → `type: commonjs`. **L'algorithme officiel reste inchangé** ;
[le test de compatibilité](../src/lib/__tests__/dependency-compat.test.ts) vérifie
le SHA-256 du source officiel reconstitué, les contrats CJS/ESM et Router.

`postinstall: patch-package --error-on-fail` réapplique cette adaptation et refuse
un patch non applicable. L'outil est dans `dependencies`, disponible même si les
devDependencies sont omises. Le dossier `patches/` doit être inclus dans les
archives de build.

## Mettre à jour ou retirer l'adaptation

1. Revoir ensemble les versions du consommateur Router/query-string, le décodeur
   et le patch. Ne pas relever les pins pour faire disparaître un avis sans
   vérifier l'API et les exports réellement utilisés.
2. Garder le patch tant que le consommateur exige CJS ; le retirer seulement
   quand l'import officiel fonctionne sans adaptation. Ne pas modifier l'algorithme
   pour contourner les tests.
3. Régénérer le lock, puis exécuter `npm ci` avec les scripts activés ; vérifier
   le postinstall et `npm ls`, sans copie périmée ni dépendance invalide.
4. Refaire `npm audit`, `npm audit --omit=dev`, `npm test`, `npm run typecheck`
   et `EXPO_NO_DOTENV=1 CI=1 npx expo install --check`.
5. Refaire l'export Android Metro dans un répertoire de recette, puis valider le
   build natif et ses parcours avant publication. Les six smokes de compatibilité
   couvrent notamment des entrées malformées finies dans un enfant limité à 3 s.

Le [défaut npm 10 de résolution des peers Vitest/Vite](https://github.com/npm/cli/issues/9787)
a nécessité npm **11.19.0 temporaire via npm exec** pour générer le lock. Le npm
global est resté **10.9.9** et son `npm ci` propre réussit ensuite, postinstall inclus.

## Preuves et portée

- Audits initialement à **9 packages de production signalés**, puis **0** dans
  les audits finaux **complet et production**, y compris l'outil patch-package.
- **194 tests réussis / 23 fichiers** avec Vitest 4.1.12 ; TypeScript et contrôle
  d'alignement Expo réussis. Installation propre et patch réappliqué vérifiés.
- Export Android Metro réel réussi : **2 041 modules, 81 assets**. Cela valide
  le bundling, pas une recette native, l'absence de vulnérabilités inconnues,
  un gain de vitesse ni la résolution de l'ANR historique.

La maintenance n'ajoute pas de fournisseur ni de flux de données runtime :
le décodeur traite les liens localement ; les autres ajouts et corrections sont
de l'outillage de build/test, sans import applicatif de patch-package.
Les listes `android.permissions` et `android.blockedPermissions` d'`app.json`
sont identiques à la base `445b140`. Les flags R8/shrink ne changent pas les
flux déjà décrits dans [Data Safety](DATA_SAFETY_DRAFT.md) : météo/cartographie
HTTPS et partages volontaires. Le manifeste de l'AAB final reste à contrôler
dans la recette de publication.

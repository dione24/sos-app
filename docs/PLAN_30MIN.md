# Plan 30 min — SOS Mali, fitness urgence

Pas un sprint. Une session. On resserre l’app autour de **appeler · prévenir · faire le geste**. Pas de nouvelle feature. Pas de refonte visuelle. On déplace, on cache, on agrandit.

Cible à T+30 : depuis l’accueil, **SOS visible, RCP et 122 visibles sans scroller, appel 122 à 2 taps, bambara médical masqué, mesh honnête**.

Ne pas toucher : BLE, SQLCipher, signatures, MapTiler, contenu clinique des guides, assets store.

```
T+0   Accueil
T+6   SOS (CTA collé + confirmation in-app)
T+14  Onglets + FAB
T+17  Guides
T+20  Mesh
T+24  Bambara masqué
T+26  Plancher typo
T+28  Dossier / onboarding / confirmation d’appel ailleurs
T+30  Typecheck
```

---

## T+0 → T+6  Accueil = pupitre, plus une sitemap

Fichier : `src/app/(tabs)/index.tsx`

**Supprimer**

- la grille de 4 tuiles (`actions` + `quickGrid`) : Dossier / Guides / Lieux / Entraide. Ce sont déjà les onglets.
- le chip météo. L’accueil n’est pas une app météo. L’écran `/weather` reste, lien Réglages inchangé.

**Garder, dans cet ordre**

1. Header (prénom + réglages)
2. Gros bouton SOS (tap → `/sos`, inchangé)
3. **RCP** et **Numéros** côte à côte, entièrement visibles au-dessus de la tab bar
4. Bandeau « Compléter mon dossier » seulement si pas de prénom

**Ajuster**

- `sosZone` `minHeight` 270 → **200** (assez pour le cercle, assez pour laisser RCP/Numéros à l’écran).
- `sosSub` 8 px → **12 px**. Copy actuelle `TOUCHER POUR ALERTER` → **« Choisir l’urgence · appeler »** (`home_touch` dans `src/i18n/messages.ts`, FR + BM).
- `home_sos_hint` : garder l’idée, formuler **« Appeler le 122 · prévenir un proche »**.
- Cartes RCP / Numéros : `minHeight` 78 → **88**, titre 12 → **15**, sous-titre 10 → **12**.

Ne pas faire d’appui long → appel depuis l’accueil (risque d’appel accidentel, review Play). Le gros bouton ouvre `/sos`. C’est l’écran SOS qu’on accélère.

---

## T+6 → T+14  SOS : l’appel est l’écran, le reste est en dessous

Fichiers : `src/app/sos.tsx`, `src/components/ui.tsx` (rien), nouveau `src/components/CallConfirm.tsx`

### 1. Pied collé = seul CTA de vie

`Screen` a déjà `footer`. S’en servir.

```
footer:
  [ Appeler le 122 ]     ← amber, 56 px, toujours visible
  si confirmation ouverte :
    « Protection Civile · réseau téléphonique »
    [ Retour ]  [ Appeler ]
```

Le bouton d’appel **sort du ScrollView**. Types, GPS, SMS, BLE défilent au-dessus. L’utilisateur paniqué n’a plus à scroller jusqu’au CTA.

Numéro : `emergencyNumber?.number ?? '122'` — inchangé. Médical / accident / incendie / noyade → 122. Agression → 101. Le type au-dessus change le label du footer en live.

### 2. Confirmation in-app, plus `Alert.alert` sur cet écran

Nouveau composant `src/components/CallConfirm.tsx` :

- overlay plein écran, fond `colors.void` 92 % opaque
- numéro en **36 px** (`font.display`)
- nom du service en 16 px
- `Appeler` (amber, 56 px) / `Retour` (outline)
- `overscroll` non concerné : `Pressable` plein écran pour dismiss
- accessibilité : `accessibilityViewIsModal`, focus sur Appeler

`confirmCall` dans `src/services/phone.ts` **reste** pour CPR / guides / annuaire (on les branche à T+28 si le temps le permet). Sur SOS uniquement : état local `pendingCall: { number, service } | null`.

Ne pas appeler `openPhoneDialer` sans cette feuille.

### 3. Réordonner le corps

Ordre actuel (mauvais) : types → GPS énorme → switch médical → appel → script → alt → SMS → BLE.

Ordre cible :

1. **Une ligne** : « Quel type d’urgence ? » + grille 6 types **inchangée** (c’est utile : ça change le 122 vs 101)
2. Carte **« À dire en premier »** (déjà écrite, la garder, la coller juste sous les types)
3. GPS : **une ligne**, pas une carte verte de 5 cm
   - si pas encore consenti : `Autoriser la position` texte + lien, **pas** un bouton green plein largeur au-dessus de l’appel
   - si consenti : `Position OK ± Xm` ou `Position indisponible · Réessayer`
4. Switch infos vitales (si opt-in dossier)
5. SMS
6. BLE / « Alerter autour de moi »

Alternates (36061, 111…) : **sous le fold**, après SMS. Le footer gère le numéro principal.

### 4. Radiogroup

La grille types : wrapper `accessibilityRole="radiogroup"` + `accessibilityLabel="Type d'urgence"`. Les cellules ont déjà `radio`.

---

## T+14 → T+17  4 onglets, FAB qui ne mange plus les listes

### Tab bar — `src/app/(tabs)/_layout.tsx`

Mesh n’est **pas** un pilier V1 (0 voisin au lancement, radar décoratif, iOS dégradé).

```tsx
<Tabs.Screen
  name="mesh"
  options={{ href: null, title: t('tabs_mesh') }}
/>
```

Route `/mesh` conservée. SOS et éventuellement Réglages y mènent encore (`router.push('/mesh')` déjà en place).

Onglets visibles : **Accueil · Guides · Lieux · Dossier**.

Label tab bar : `fontSize` 10 → **11**.

### FAB — `src/components/EmergencyFab.tsx` + `src/components/Screen.tsx`

- `EMERGENCY_FAB_SCROLL_CLEARANCE` 72 → **96**
- `accessibilityHint` : « Ouvre l’écran d’appel d’urgence » (plus « choix du type »)
- Ne **pas** afficher le FAB sur `/mesh` non plus si on y arrive (pathname), pour ne pas recouvrir « Arrêter de partager ». Condition actuelle `pathname !== '/'` → `pathname !== '/' && pathname !== '/mesh'`

---

## T+17 → T+20  Guides : la liste d’abord

Fichier : `src/app/(tabs)/guides.tsx`

Ordre actuel : bannière offline → bannière IFRC → titre → liste. L’hémorragie est sous le FAB.

Ordre cible :

1. Header
2. Titre « Choisissez une situation » + hint audio
3. **Liste des 10 guides**
4. Bannière offline (déplacer en bas)
5. Bannière sources IFRC/ERC/OMS (déplacer en bas)
6. Disclaimer légal (déjà en bas, garder)

Aucune copie médicale à éditer.

---

## T+20 → T+24  Mesh honnête

Fichier : `src/app/(tabs)/mesh.tsx`

**Supprimer le radar** (`styles.radar`, `nodePositions`, anneaux, `sweep`, nœuds aux positions fake). C’est une carte qui ment.

Remplacer par une **Card statut** d’une ligne :

- « Écoute des téléphones proches » / « En pause » / « Bluetooth désactivé » / « Autorisation manquante »
- compteur `N alerte(s) récente(s)` — pas « N téléphones proches » sur un sonar

**Empty state** (quand `displayHistory.length === 0`) :

- Titre : « Aucune alerte autour de vous »
- Texte : « Ça marche seulement si un autre téléphone SOS Sécurité Mali est à quelques mètres, avec cet écran ouvert. L’appel 122 et le SMS restent disponibles sans ça. »
- Bouton outline : « Appeler le 122 » → `confirmCall('122', …)` ou `router.push('/sos')`

**« Pas maintenant »** : aujourd’hui `router.replace('/')`. Trop brutal.

- `setBleConsent(false)` et **rester sur l’écran**, historique + empty state visibles
- ne pas relancer le scan (`if (!allowed) return` est déjà là)

Ne pas toucher `ble-mesh.ts`, TTL, signatures, GATT.

---

## T+24 → T+26  Cacher le bambara médical

Les docs (`README.md`, `docs/MEDICAL_CONTENT_REVIEW.md`) disent « masqué en V1 ». L’UI l’expose. Les textes BM sont `pending_clinical_validation`. On cache, on ne supprime pas.

### Réglages — `src/app/settings.tsx`

- Bouton Bamanankan : `disabled`, style `opacity: 0.42`, **ne plus appeler** `chooseLanguage('bm')`
- Sous-texte déjà honnête (« en préparation ») : garder
- Optionnel : `Alert` au tap « Les guides bambara seront proposés après validation médicale. »

### Guide — `src/app/guide/[id].tsx`

- Retirer la rangée FR / BM (`langRow` / `langControl`)
- `contentLanguage` forcé `'fr'` pour cette V1 (le store langue peut rester, les **étapes** s’affichent en FR)
- Badge audio FR : garder

### Accueil / i18n chrome

Ne pas retirer `messages.bm`. Si quelqu’un a déjà `language=bm` en settings SQLite, le chrome BM reste, mais plus aucun geste médical BM. Au bootstrap (`src/app/_layout.tsx`), si `language === 'bm'` → **forcer `'fr'`** et `setSetting(..., 'language', 'fr')`. Une ligne. Zéro utilisateur coincé sur un mixte dangereux.

---

## T+26 → T+28  Plancher typo 11 / 16 / 20

Pas un restyle. Un grep.

**Thème** `src/constants/theme.ts`

- `type.small.fontSize` 13 **inchangé** (déjà au-dessus du plancher)
- `type.eyebrow.fontSize` 11 → **12**, `letterSpacing` 1.2 → **0.8** (plus lisible)

**Règle** : dans `src/app/**` et `src/components/**`, aucun `fontSize` **< 11** hors cas volontaire unique (le « SOS » 44 et le « 110 » 64 restent).

Remplacements mécaniques, pas de créativité :

| Fichier | Tokens |
|---|---|
| `index.tsx` | `sosSub` 8→12, `quickSub` (supprimé avec la grille), `directTitle` 12→15, `directSub` 10→12, `weatherText` (supprimé) |
| `sos.tsx` | `disclosureText` 10→12, `alternateScope` 7→11, `callPrepLabel` 9→11, `alternateHeading` 9→11, `privacyText` 10→12, `accuracy` 10→11 |
| `directory.tsx` | `category` 7→11, `description` 10→12, `scope` 9→11, `priorityText` 10→12 |
| `mesh.tsx` | tout 7–10 → 11–12 |
| `guides.tsx` | `meta` 9→11, `offlineText` / `reviewText` 11 OK |
| `map.tsx` | `filterText` 10→12, `downloadText` 10→12, `itemMeta` 10→12, `distanceText` 10→12, `routeText` 10→12, `attribution` 9→11 |
| `cpr.tsx` | `bpmLabel` / `state` / `statLabel` 9→11, `stopSub` 10→11 |
| `guide/[id].tsx` | `audioSub` 10→11 (le corps 20 px **ne pas baisser**) |
| `settings.tsx` / `privacy.tsx` / `weather.tsx` / `profile.tsx` | tous les 8–10 → 11 |

`sandFaint` `#747A72` sur 11 px + fond blanc : acceptable. Ne pas retoucher la palette.

---

## T+28 → T+30  Trois nits + filet de sécu

### Dossier — `src/app/(tabs)/profile.tsx`

Vue résumé : `contacts.filter((item) => item.name)` ignore un contact « juste un numéro ».

```ts
contacts.filter((item) => item.name.trim() || isValidEmergencyPhone(item.phone))
```

**Ne pas** rendre le téléphone du profil éditable. C’est la PK SQL. Changer le numéro sans migration = contacts orphelins. Hors session.

### Onboarding — `src/app/onboarding.tsx`

Sous le titre, **une** phrase avant le formulaire :

> En danger immédiat : passez, puis touchez SOS et appelez le 122.

Le bouton skip existe déjà (`Accéder au SOS sans dossier`). Ne pas ajouter de 3ᵉ CTA.

### Confirmation d’appel ailleurs

Si `CallConfirm` est en place : brancher **CPR** (`src/app/cpr.tsx`) — c’est le 2ᵉ écran de crise. Directory et guide : `confirmCall` Alert, acceptable pour cette session.

Si plus de 60 s : skip, SOS seul suffit.

### Filet

```bash
npx tsc --noEmit
```

Doit rester vert. Aucun test mesh/RCP à casser : on n’y touche pas.

---

## Critères de fin (pas de capture Play à refaire dans la session)

Cocher mentalement, device ou simulateur :

- [ ] Accueil : SOS + RCP + Numéros visibles **sans scroller** sur un écran ~800 px de haut (TECNO / Pixel 5)
- [ ] Accueil : plus de 4 tuiles, plus de météo
- [ ] SOS : bouton « Appeler le 122 » visible dès l’ouverture, **sans scroller**
- [ ] SOS : agression → le footer affiche 101
- [ ] SOS : confirmation in-app, gros numéro, pas de dialog système
- [ ] SOS : GPS n’est plus un pavé vert au-dessus de l’appel
- [ ] 4 onglets, plus « Alertes »
- [ ] `/mesh` joignable depuis SOS « Alertes proches »
- [ ] Mesh : pas de radar, empty state qui dit la vérité, « Pas maintenant » ne dump pas à l’accueil
- [ ] Guides : 1er item (RCP) visible sans scroller les bannières
- [ ] Aucun sélecteur Bamanankan actif ; une langue `bm` déjà sauvée retombe sur FR
- [ ] Aucun `fontSize` < 11 dans `src/app` / `src/components` (sauf display SOS/RCP)
- [ ] `tsc --noEmit` OK

---

## Hors session (volontaire)

Ça reste vrai, ça ne rentre pas dans 30 min. Ne pas improviser.

| Sujet | Pourquoi pas maintenant |
|---|---|
| i18n complet SOS / RCP / mesh / dossier / annuaire | 40+ strings, relecture BM |
| Voix bambara + validation clinique | Locuteur + médecin, pas du code |
| Schémas RCP / étouffement / PLS | Assets, pas un déplacement de vues |
| Widget Android « 122 » | Module natif + fiche Play |
| Rendre le n° de dossier éditable | PK + migration contacts |
| Carte hors Bamako | Données OSM à vérifier |
| TalkBack device | QA physique, runbook déjà prévu |
| Palette / dark mode / restyle | Hors sujet |

---

## Fichiers touchés (liste close)

```
src/app/(tabs)/index.tsx
src/app/(tabs)/_layout.tsx
src/app/(tabs)/guides.tsx
src/app/(tabs)/mesh.tsx
src/app/(tabs)/profile.tsx
src/app/sos.tsx
src/app/onboarding.tsx
src/app/settings.tsx
src/app/guide/[id].tsx
src/app/_layout.tsx          # forcer FR si bm
src/app/cpr.tsx              # optionnel, CallConfirm
src/components/CallConfirm.tsx          # nouveau
src/components/EmergencyFab.tsx
src/components/Screen.tsx    # clearance 96, déjà paramétré
src/constants/theme.ts
src/i18n/messages.ts         # home_touch, home_sos_hint
```

Plus, en passant, les `fontSize` listés T+26 dans directory / map / weather / privacy / settings.

**Interdit d’ouvrir** : `src/services/ble-mesh.ts`, `src/lib/mesh.ts`, `src/db/database.ts`, `src/lib/cpr.ts`, `assets/data/*`, `app.json`, store-assets.

---

## Ordre d’implémentation (copier-coller)

1. `index.tsx` + `messages.ts` — accueil nu
2. `CallConfirm.tsx` + `sos.tsx` — appel collé
3. `_layout.tsx` + `EmergencyFab.tsx` — 4 tabs / FAB
4. `guides.tsx` — liste d’abord
5. `mesh.tsx` — radar out, empty, stay
6. `settings.tsx` + `guide/[id].tsx` + `_layout.tsx` — BM off
7. `theme.ts` + grep `fontSize: [7-9]` / `fontSize: 10` — plancher
8. `profile.tsx` + `onboarding.tsx` (+ `cpr.tsx` si temps)
9. `npx tsc --noEmit`

Si on dépasse 30 min, **s’arrêter après l’étape 6**. Les étapes 1–6 changent le produit. 7–8 sont du polish. 9 est non négociable dès qu’on commit.

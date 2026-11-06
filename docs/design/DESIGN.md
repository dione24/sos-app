# Système de design — SOS Sécurité Mali

Direction : **sobre, lisible au soleil, utilisable d'une main et sous stress**. Le rouge est réservé au SOS ; tout le reste est calme. Une seule famille de police, un seul set d'icônes, une grille 4/8. Comparatif avant/après : `docs/design/screens/comparatif.html`.

## Principes
- **SOS en un geste** : bouton SOS de 220 px sur l'accueil, bouton flottant « SOS » sur les autres onglets, appel principal toujours en pied d'écran fixe.
- **Cibles ≥ 56 px** pour les actions critiques (appeler, SOS, suivant), ≥ 48 px pour les contrôles secondaires ; jamais de lien texte sans zone de touche.
- **Lisibilité** : corps 16 px, jamais moins de 13 px ; contrastes AA (texte ≥ 4,5:1, grands titres et icônes ≥ 3:1) vérifiés dans les deux thèmes.
- **Sobriété** : aplats, pas de dégradé, pas de halo décoratif ; cartes blanches sur fond gris clair, bordures 1 px.
- **Français d'abord**, bambara prévu (chaînes dans `src/i18n`, sélecteur présent mais désactivé jusqu'à validation).
- **Un seul set d'icônes** : Lucide, trait 2, tailles 20 / 24 (32 pour les tuiles de guide).

## Couleurs (`src/theme/tokens.ts`)
| Rôle | Clair | Sombre | Usage |
|---|---|---|---|
| Fond / surface | `#F2F4F7` / `#FFFFFF` | `#0B1220` / `#141B2B` | écran, cartes |
| Bordure | `#E4E7EC` | `#27324A` | cartes, champs |
| Encre / atténuée / discrète | `#0F172A` / `#475467` / `#667085` | `#F3F4F6` / `#AAB4C3` / `#8A94A6` | texte |
| **SOS** | `#C8102E` (pressé `#A50D25`) | identique | bouton SOS, appels d'urgence, erreurs |
| Danger (texte / fond) | `#B42318` / `#FEF3F2` | `#FDA29B` / `#2B1210` | messages critiques |
| **Primaire** (vert profond) | `#0B6E4F` (pressé `#09583F`) | `#3CCB9A` sur texte `#04281E` | actions normales, sélection, positif |
| Primaire (texte / fond) | `#0B6E4F` / `#E6F4EE` | `#6CE9B9` / `#12352B` | liens, états validés |
| Avertissement | `#B54708` / `#FFF6ED` | `#FDB022` / `#2E1F08` | données périmées, à vérifier |
| Info | `#175CD3` / `#EFF6FF` | `#84CAFF` / `#102A4A` | position, carte |

Pourquoi changer : le corail `#FF5A3D` + texte noir se lisait « orange » (3,6:1) et l'appel au 122 était brun. Le rouge `#C8102E` (5,9:1 avec du blanc) est le rouge des secours ; le vert profond rappelle le drapeau sans crier et laisse le rouge au seul SOS. Le mode sombre suit le réglage du téléphone (`userInterfaceStyle: automatic`).

## Typographie (DM Sans uniquement)
display 40/46 bold (« SOS ») · h1 28/34 bold · h2 22/28 bold · h3 18/24 semibold · body 16/24 · bodyStrong 16 semibold · caption 14/20 · overline 13/16 semibold capitales (rare). `maxFontSizeMultiplier` 1,3–1,6 selon le rôle ; les grilles passent en colonne au-delà de 1,3.

## Espacement, rayons, ombres
Grille 4/8 : 4, 8, 12, 16, 20, 24, 32, 40. Marge d'écran 16, écart entre blocs 16. Rayons : 8 (puces), 12 (contrôles), 16 (cartes), 20 (grandes cartes), pleine (pilules, SOS). Ombres : aucune sur les cartes (bordure 1 px), une ombre douce uniquement sur les éléments flottants (SOS, FAB).

## Composants (`src/components/ui/`)
- **Button** : `sos` (rouge), `primary` (vert), `secondary` (surface + bordure), `ghost` ; hauteur 56 (`size="md"` : 48) ; icône à gauche, état chargement, désactivé à 45 %.
- **IconButton** 48 px ; **EmergencyFab** : pilule rouge « SOS » avec icône, au-dessus de la barre d'onglets.
- **Card** (`tone` neutral / primary / warning / danger / info) ; **ListRow** (tuile d'icône 44, titre, sous-titre, chevron ou texte) ; **IconTile** ; **SectionHeader** (titre + aparté) ; **Tag** (pilule 28 px, rare) ; **Notice** (bandeau icône + texte) ; **ToggleRow** (titre + Switch) ; **Field** (libellé 14, champ 56, focus vert) ; **EmptyState** (icône, titre, texte, action) ; **StepProgress** ; **Divider**.
- **AppHeader** : retour 48 px, titre h1 (ou h2 si long), sous-titre caption, action à droite. **Screen** : marges, pied fixe, dégagement du FAB.

## États
Chargement : `ActivityIndicator` couleur primaire + texte. Vide : `EmptyState` avec action. Erreur / données périmées : `Notice` warning ou danger, jamais un simple texte gris. Pressé : fond pressé (boutons pleins) ou opacité 0,7. Désactivé : opacité 0,45 + `accessibilityState`.

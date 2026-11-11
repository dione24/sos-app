# Système de design — Nafalan

Direction validée le **11 novembre 2026** : sobre, lisible et cohérente avec le
bouclier rouge du logo. Les actions ordinaires et les liens appartiennent à la
famille rouge profond ; le SOS reste distinct par son rouge vif, sa taille et
son libellé. Le vert sert uniquement à un état positif explicite, jamais au CTA
principal. Les trois petites barres du drapeau malien dans l'icône sont conservées.

## Principes

- **SOS en un geste** : bouton de 220 px sur l'accueil, bouton flottant sur les
  autres onglets, appel principal clairement identifié en pied d'écran.
- **Cibles tactiles** : au moins 56 px pour les actions critiques, 48 px pour les
  contrôles secondaires ; ne pas réduire un lien à une petite zone de texte.
- **Cible AA** : texte courant au moins 4,5:1 ; grands textes et icônes utiles au
  moins 3:1. Vérifier le couple texte/fond réel dans les deux thèmes et les états
  pressé/focus ; les bordures décoratives ne constituent pas le seul repère.
- **États explicites** : couleur accompagnée de texte et/ou d'une icône. Le vert
  signifie succès ou vérification, l'ambre une attente ou une donnée à confirmer.
- **Sobriété** : surfaces neutres, aplats, bordures discrètes ; les halos rosés
  appartiennent au logo. Pas de dégradé décoratif dans les écrans.
- **Français d'abord** : le bamanankan reste désactivé jusqu'à validation des
  traductions et enregistrements.

## Palette de référence

La source applicative est [`src/theme/tokens.ts`](../../src/theme/tokens.ts).
Le mode sombre suit le réglage du téléphone.

| Rôle | Clair | Sombre |
| --- | --- | --- |
| Fond / surface / alternative | `#F7F7F8` / `#FFFFFF` / `#F3F3F5` | `#121114` / `#1D1B20` / `#26232A` |
| Bordure / focus neutre | `#E4E4E8` / `#8E8795` | `#39343E` / `#81778A` |
| Encre / atténuée / discrète | `#1C1C24` / `#52525F` / `#6B6B78` | `#F7F4F6` / `#C4BEC6` / `#A39CA8` |
| Primaire / pressé / texte sur bouton | `#A61B35` / `#87142A` / `#FFFFFF` | `#C83C59` / `#AD2B47` / `#FFFFFF` |
| Primaire texte / fond / bordure | `#A61B35` / `#FCECEF` / `#E8B6C1` | `#FDA4B5` / `#371D27` / `#764051` |
| SOS / pressé / texte | `#C8102E` / `#A50D25` / `#FFFFFF` | `#DE163B` / `#BA1231` / `#FFFFFF` |
| Danger texte / fond / bordure | `#B4232D` / `#FDEFF1` / `#F2BAC3` | `#FFB1B9` / `#38191E` / `#81424A` |
| Succès texte / fond / bordure | `#16634A` / `#ECF6F0` / `#BADBC7` | `#87D8AE` / `#172D25` / `#335B48` |
| Avertissement texte / fond | `#B54708` / `#FFF6ED` | `#FDB022` / `#2E1F08` |
| Information texte / fond | `#475569` / `#F0F1F4` | `#BDC7D6` / `#22262F` |

## Contrastes calculés sur les aplats

| Couple mesuré | Clair | Sombre |
| --- | --- | --- |
| Texte blanc / bouton primaire | **7,42:1** | **4,95:1** |
| Texte blanc / primaire pressé | **9,71:1** | **6,54:1** |
| Texte blanc / SOS | **5,88:1** | **4,90:1** |
| Texte primaire / fond primaire | **6,50:1** | **8,16:1** |
| Texte succès / fond succès | **6,51:1** | **8,66:1** |

Ces rapports sont des calculs de luminance des couleurs fournies. Ils ne remplacent
pas une recette visuelle native de tous les composants, états et tailles de texte.
La recette fonctionnelle réalisée avec l'ancienne palette ne valide pas le rendu
de la nouvelle charte. Les captures de fiche doivent provenir du nouveau build.

## Typographie et composants

Une seule famille de texte : **DM Sans**. Display 40/46 bold ; h1 28/34 bold ;
h2 22/28 bold ; h3 18/24 semibold ; corps 16/24 ; légende 14/20 ; surligne 13/16.
Respecter le redimensionnement de police et passer les grilles en colonne quand
nécessaire. Les icônes Lucide utilisent les tailles 20/24, 32 pour les guides.

- **Button** : `primary` rouge profond, `sos` rouge vif, `secondary` surface neutre,
  `ghost` texte primaire ; icône et libellé utilisent le même contraste.
- **Field / ToggleRow / onglet actif / StepProgress** : sélection et focus dans la
  famille primaire rouge. Un état positif métier utilise le ton `success` dédié.
- **Card / Notice / Tag / IconTile** : tons neutral, primary, success, warning,
  danger ou info selon le sens ; ne pas convertir une donnée « à confirmer » en
  validation verte.
- **QR médical** : conserver son fond blanc et ses modules foncés, indépendamment
  du thème ; ne pas recolorer le QR avec la palette de marque.

Grille 4/8, marge d'écran 16, espacements 4/8/12/16/20/24/32/40. Rayons
8/12/16/20 ou pleine pilule. Ombre douce réservée aux éléments flottants.
Chargement accompagné de texte ; erreurs et données périmées explicitement
nommées. L'état désactivé garde une indication accessible et ne repose pas sur
la seule transparence.

## Logo, splash et supports store

Les SVG restent les sources : bouclier **`#C8102E`**, halo **`#FCECEF`**, trait
rosé **`#E8B6C1`**, ponctuation blanche, fond neutre **`#F7F7F8`**. La géométrie
du bouclier et les barres du drapeau sont conservées ; aucun corail ni anneau
menthe ne sert d'accent de marque.

Les PNG sont rendus par `rsvg-convert` : icône app 1024² et store 512² en **RGB
opaque** ; adaptive foreground 1024² et splash 512² avec **alpha conservé** ;
feature graphic 1024 × 500 en RGB. Le visuel store emploie les rouges et neutres
ci-dessus. Le HTML de confidentialité utilise les mêmes familles de couleurs et
DM Sans ; son contenu et sa date restent indépendants de cette modification CSS.
Pour le rendu texte du SVG, Fontconfig charge les fontes DM Sans 400/500/600/700
de `node_modules/@expo-google-fonts/dm-sans/` ; aucune fonte système n'est installée.

Sur le visuel store, les rapports calculés sont **15,81:1** pour le titre,
**7,18:1** pour le texte secondaire, **6,93:1** pour l'accent et **5,88:1** pour
le texte blanc du SOS. Sur le HTML, les textes et liens atteignent au moins
**6,93:1** en clair et **9,07:1** en sombre sur les fonds et surfaces déclarés.
Ces calculs portent sur les aplats, sans promesse de validation complète des
écrans ni du rendu des stores.

Les captures historiques et le [comparatif antérieur](screens/comparatif.html)
restent des archives. Ils ne décrivent pas la charte du 11 novembre 2026.

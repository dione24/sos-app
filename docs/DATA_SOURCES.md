# Sources des données embarquées

## Numéros d’urgence

Les liens et leur portée sont centralisés dans
`src/constants/governmentSources.ts`. Ils documentent les informations publiées ;
ils ne prouvent ni la disponibilité téléphonique des lignes, ni une affiliation
de l’application à l’État. SOS Sécurité Mali est une application indépendante et
non gouvernementale éditée par SahelPay Technologies.

Les pages ci-dessous ont été consultées le **10 novembre 2026** :

| Source primaire accessible | Informations effectivement soutenues |
| --- | --- |
| [Information Gouvernementale du Mali — Conseil des ministres du 25 mars 2026](https://gouvernement.ml/communique-du-conseil-des-ministres-cm-n2026-12-sgg/) | 101 Police ; 111 Gendarmerie ; 122 Protection civile ; 133 lutte contre les armes légères ; 135 Office central des Stupéfiants ; 144 Centre de Coordination et de Gestion des Crises ; 145 Garde nationale. Le communiqué indique la gratuité sur l’ensemble du territoire national. |
| [Ministère de la Santé — Numéros d’urgence, 29 juin 2026](https://sante.gov.ml/index.php?Itemid=111&catid=19&id=187%3Anumeros-d-urgence&option=com_content&view=article) | 36061 (information et orientation sanitaire) ; 101, 111, 122, 144, 145 ; Protection civile 80 00 12 01 / 20 22 80 81 ; Police secours 80 00 11 15 / 20 23 95 11 ; Police nationale 80 00 11 25 ; Gendarmerie 80 00 11 14. |
| [SOMAGEP-SA — Contact](https://www.somagep.ml/contact/) | 20 70 41 00 ; numéros verts 66 74 78 32 et 20 22 69 27. |
| [EDM-SA — Pour nous joindre](https://www.edmsa.ml/contact) | 36077 ; 20 70 42 00 ; 20 22 30 20 ; 20 22 30 60 ; dépannage rive gauche 66 75 21 36 / 20 70 42 95 / 20 70 42 96 ; rive droite 66 75 57 54 / 20 70 42 58. |

Ces quatre pages soutiennent **26 des 27 numéros** embarqués, sans ajouter les
autres lignes également présentes dans certaines sources. L’ancien lien PDF du
SGG pour les sept numéros courts répondait HTTP 403 lors de cette vérification ;
la version HTML officielle ci-dessus reprend le communiqué et reste accessible.

### Référence historique, fonctionnement actuel non confirmé

Le [site du ministère de la Promotion de la Femme, de l’Enfant et de la Famille](https://mpfef.gouv.ml/index.php/2022/03/21/la-ministre-wadidie-foune-coulibaly-a-expose-les-avancees-du-mali-dans-la-lutte-contre-les-vbg-a-new-york/)
mentionne le **80 333** dans une publication du **21 mars 2022**, attribuée à
Malijet. C’est une publication ancienne hébergée par le ministère, pas une
confirmation primaire du fonctionnement du service en 2026. L’entrée reste
`needs_field_verification` et doit être affichée avec cette limite. La date de
consultation du lien ne doit pas remplacer sa date historique de vérification.
Le 80 333 est conservé dans l’annuaire avec cette limite historique, mais retiré
des recommandations automatiques du parcours SOS pour une agression. Aucun
numéro de substitution n’a été ajouté ; le 101 et les alternatives déjà
documentées, dont le 111, restent disponibles.

## Lieux de Bamako

Les 14 points conservés dans `health-facilities.json` et `police-stations.json`
(neuf lieux de santé et cinq commissariats) portent des identifiants
OpenStreetMap et une date d’extraction du 10 août 2026. Il s’agit de données
communautaires, pas d’un annuaire gouvernemental. Ils n’ont pas été revérifiés
sur le terrain lors du contrôle documentaire du 10 novembre 2026.

Les horaires absents d’OSM sont affichés « à confirmer ». Une mention « 24 h / 24
(OSM) » ne constitue pas une confirmation par l’établissement. La gendarmerie de
Sébénikoro, non retrouvée dans l’extraction précédente, a été retirée.

Licence/attribution : données © contributeurs OpenStreetMap, ODbL.

[OpenStreetMap — copyright et licence](https://www.openstreetmap.org/copyright)
(page consultée le 10 novembre 2026).

Avant chaque publication, relancer l’extraction, vérifier les suppressions et appeler
un échantillon de lieux pour confirmer l’accueil des urgences et les horaires.

## Consignes et guides

Les recommandations de premiers secours des dix guides sont des contenus
éditoriaux documentés dans `docs/MEDICAL_CONTENT_REVIEW.md` (IFRC, ERC et OMS),
pas des consignes émises ni approuvées par le Gouvernement du Mali. Les appels
au 122 dans les guides, l’accueil, l’annuaire, l’onboarding et le parcours SOS
s’appuient sur les sources gouvernementales ci-dessus.

La page Santé conseille également d’indiquer sa position exacte, la nature de
l’urgence et les personnes concernées lors d’un appel ; elle ne valide pas le
relais Bluetooth ni la remise de SMS par l’application à un service public.

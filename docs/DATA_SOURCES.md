# Sources des données embarquées

## Numéros d’urgence

Chaque entrée de `assets/data/emergency-numbers.json` contient son URL officielle,
sa date de vérification et son statut. Les numéros courts 101, 111, 122, 133, 135,
144 et 145 proviennent du communiqué du Conseil des ministres du 25 mars 2026. Le
36061 et les lignes longues Protection Civile, Police et Gendarmerie proviennent de
la page du ministère de la Santé du 29 juin 2026. Seul le 80 333, documenté par une
source officielle de 2022, reste marqué comme nécessitant une vérification terrain.

## Lieux de Bamako

Les 14 points conservés dans `health-facilities.json` et `police-stations.json` ont
été rapprochés de l’API OpenStreetMap/Overpass le 10 août 2026. Chaque point contient
le type et l’identifiant OSM. Les horaires absents d’OSM sont affichés « à confirmer ».
La gendarmerie de Sébénikoro, non retrouvée dans l’extraction actuelle, a été retirée.

Licence/attribution : données © contributeurs OpenStreetMap, ODbL.

https://www.openstreetmap.org/copyright

Avant chaque publication, relancer l’extraction, vérifier les suppressions et appeler
un échantillon de lieux pour confirmer l’accueil des urgences et les horaires.

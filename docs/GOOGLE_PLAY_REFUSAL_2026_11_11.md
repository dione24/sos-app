# Nafalan — refus Google Play du 11 novembre 2026

## État du dossier

**Refus constaté ; correction web publiée ; nouveau renvoi enregistré à 12:21 UTC.**
À 12:24 UTC le 11 novembre 2026, les vérifications automatiques sont terminées et
Google affiche « Vos modifications sont en cours d'examen ».
Ce document n'atteste ni une approbation Google ni une publication publique.

| Élément | Valeur |
| --- | --- |
| App | Nafalan — SOS & secours |
| Version concernée | 1.0.2 (8) |
| Package | `ml.sossecurite.app` |
| Compte de publication | MHM Digital Agency |
| Éditeur présenté dans l'app | SahelPay Technologies |
| Date du refus affichée | 11 novembre 2026 |
| URL de confidentialité conservée | https://www.sahelpay.ml/apps/sos-securite-mali/privacy |
| Ancien lien de suppression cité par Google | https://www.sahelpay.ml/apps/sos-securite-mali/privacy |
| Nouvelle URL de suppression enregistrée | https://www.sahelpay.ml/apps/sos-securite-mali/delete-data |

## Motif observé et limites du diagnostic

La Console affiche un refus dans la rubrique « Données de l'utilisateur – Exigence
de suppression de compte ». Google indique que la page de suppression déclarée ne
fait pas référence à l'entité nommée dans la fiche Play Store. L'e-mail et la
Console citent exactement l'ancienne URL ci-dessus.

Lors de la relecture dans le navigateur, cette page présentait déjà **Nafalan**,
**SahelPay Technologies** et le package, avec l'effacement en section 6. Le nom du
compte de publication **MHM Digital Agency** n'y figurait pas et la procédure de
suppression était peu visible. Ces observations justifient une page dédiée plus
explicite ; elles ne prouvent pas ce que le vérificateur a vu ni la cause précise
du refus. Aucune hypothèse de cache ou de renommage n'est présentée comme acquise.

## Correction web publiée

La PR [dione24/sahelpay-landing #11](https://github.com/dione24/sahelpay-landing/pull/11)
est fusionnée au commit **`6d1df2fb5e547f25706d5007b275ea51ca3f6b7f`**. Son contenu
ajoute une page statique `delete-data`, son rewrite exact et un lien visible
depuis la politique ; elle ajoute aussi l'identité du compte de publication à la
politique. Le déploiement de production **`dpl_3ok7K8VwBpcag1ze29TuAVJn3tNj`**
est `READY` et pointe vers ce commit. La nouvelle URL publique a été ouverte dans
le navigateur : les identités, la procédure et les contacts sont présents sans
connexion. Le rendu bureau sombre a été inspecté ; les rendus mobile et clair
n'ont pas fait l'objet d'une nouvelle recette visuelle.

La nouvelle page précise :

- les noms **Nafalan — SOS & secours**, **MHM Digital Agency** et **SahelPay Technologies** ;
- l'identifiant `ml.sossecurite.app` et l'absence de compte utilisateur ;
- le parcours **Réglages → Confidentialité et données → Effacer toutes mes données
  → Continuer → Tout effacer** ;
- les données locales effacées et les deux confirmations ;
- les contacts de demande et d'assistance, sans demander de dossier médical ni
  de donnée personnelle sensible ;
- les limites concernant les copies envoyées aux destinataires et les journaux
  des fournisseurs, dont la conservation de 90 jours annoncée pour Open-Meteo.

L'éditeur ne reçoit pas le dossier médical local sur un serveur et ne peut donc
pas l'effacer à distance. Aucune nouvelle collecte ni promesse de suppression des
copies chez des tiers n'est ajoutée.

## Périmètre applicatif conservé

Cette correction porte sur les pages publiques, le champ de suppression du
formulaire et la documentation. Aucun code de l'app, permission, schéma de base,
package, version ou pays n'est changé. Aucun nouveau build Android n'est requis
pour ce changement de lien externe.

L'AAB signé 1.0.2 (8) reste celui du dossier de sortie :
`af03cae92c963ac003762d6a78023209ad2bdae88b853ea5a0e5f21d5c7b4a2c`
(SHA-256). Les résultats et limites de la recette native sont ceux de
[RELEASE_1.0.2.md](RELEASE_1.0.2.md), sans validation supplémentaire sous-entendue.

## Reçu de renvoi — dernière observation le 11 novembre 2026 à 12:24 UTC

| Vérification | État présent |
| --- | --- |
| Déploiement Vercel de production | READY, commit `6d1df2fb5e547f25706d5007b275ea51ca3f6b7f` |
| Nouvelle URL publique | Ouverte sans connexion, contenu vérifié dans le navigateur |
| Nouveau lien enregistré dans la Console | Confirmé dans l'aperçu et par « Modification enregistrée » |
| Modifications renvoyées pour examen | Dix modifications, même version 1.0.2 (8), Mali |
| Heure UTC du renvoi enregistré | 12:21 UTC le 11 novembre 2026 |
| Publication gérée | Désactivée, déploiement complet après approbation |
| Contrôles automatiques Google | Terminés à la dernière observation |
| État de l'examen | « Vos modifications sont en cours d'examen » |
| Décision Google après correction | En attente ; aucune approbation constatée |

La Console ne montre plus de modifications à envoyer. Les captures et les reçus
techniques sont conservés localement hors dépôt. Les compilations TypeScript/Vite,
le contrôle des trois fichiers web et `npm run verify:play-submission` ont réussi.
Les 51 autres fichiers web existants sont inchangés. Aucun nouveau test Android
ni nouvelle validation clinique n'est sous-entendu par cette correction de page.

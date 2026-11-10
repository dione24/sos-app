export const GOVT_INDEPENDENCE_NOTICE = 'Application indépendante, non affiliée au gouvernement du Mali ni aux services publics de secours.';

export type GovernmentSource = {
  id: string;
  title: string;
  authority: string;
  url: string;
  coverage: string;
  lastCheckedAt: string;
  status: 'accessible' | 'historical';
  note?: string;
};

/** Verification concerns the published page, not telephone availability. */
export const GOVERNMENT_SOURCES: readonly GovernmentSource[] = [
  {
    id: 'government-emergency-short-numbers',
    title: 'Conseil des ministres du 25 mars 2026',
    authority: 'Information Gouvernementale du Mali · communiqué du Gouvernement',
    url: 'https://gouvernement.ml/communique-du-conseil-des-ministres-cm-n2026-12-sgg/',
    coverage: '101 Police, 111 Gendarmerie, 122 Protection civile, 133 lutte contre les armes légères, 135 Office central des Stupéfiants, 144 gestion des crises et 145 Garde nationale. Le communiqué indique leur gratuité sur le territoire national.',
    lastCheckedAt: '2026-11-10',
    status: 'accessible',
    note: 'Source publiée le 25 mars 2026. La consultation de la page ne confirme pas la disponibilité effective de chaque ligne.',
  },
  {
    id: 'health-emergency-contacts',
    title: 'Numéros d’urgence et orientation sanitaire',
    authority: 'Ministère de la Santé et du Développement Social du Mali',
    url: 'https://sante.gov.ml/index.php?Itemid=111&catid=19&id=187%3Anumeros-d-urgence&option=com_content&view=article',
    coverage: '36061 pour l’information et l’orientation sanitaire ; 101, 111, 122, 144 et 145 ; contacts complémentaires Protection civile (80 00 12 01, 20 22 80 81), Police (80 00 11 15, 20 23 95 11, 80 00 11 25) et Gendarmerie (80 00 11 14).',
    lastCheckedAt: '2026-11-10',
    status: 'accessible',
    note: 'Page datée du 29 juin 2026. Le 36061 est présenté comme un service d’information et d’orientation sanitaire.',
  },
  {
    id: 'somagep-contact',
    title: 'Contacts du service d’eau potable',
    authority: 'Société Malienne de Gestion de l’Eau Potable · SOMAGEP-SA',
    url: 'https://www.somagep.ml/contact/',
    coverage: 'Contact 20 70 41 00 ; numéros verts 66 74 78 32 et 20 22 69 27.',
    lastCheckedAt: '2026-11-10',
    status: 'accessible',
    note: 'Contacts du service d’eau potable ; ils ne remplacent pas les services de secours.',
  },
  {
    id: 'edm-contact',
    title: 'Contacts et dépannage électricité',
    authority: 'Énergie du Mali · EDM-SA',
    url: 'https://www.edmsa.ml/contact',
    coverage: 'Centre d’appel 36077 ; contacts 20 70 42 00, 20 22 30 20 et 20 22 30 60 ; dépannage rive gauche (66 75 21 36, 20 70 42 95, 20 70 42 96) et rive droite (66 75 57 54, 20 70 42 58).',
    lastCheckedAt: '2026-11-10',
    status: 'accessible',
    note: 'Contacts du fournisseur d’électricité ; ils ne remplacent pas les services de secours.',
  },
];

/** An old publication is not evidence that this service still operates. */
export const HISTORICAL_GOVERNMENT_SOURCES: readonly GovernmentSource[] = [
  {
    id: 'mpfef-vbg-historical',
    title: 'Référence historique : numéro vert contre les VBG',
    authority: 'Ministère de la Promotion de la Femme, de l’Enfant et de la Famille',
    url: 'https://mpfef.gouv.ml/index.php/2022/03/21/la-ministre-wadidie-foune-coulibaly-a-expose-les-avancees-du-mali-dans-la-lutte-contre-les-vbg-a-new-york/',
    coverage: 'Publication du 21 mars 2022 mentionnant le 80 333 contre les violences basées sur le genre.',
    lastCheckedAt: '2026-11-10',
    status: 'historical',
    note: 'Article ancien republié sur le site du ministère et attribué à Malijet. Le fonctionnement actuel du 80 333 n’est pas confirmé ; une vérification auprès du service reste nécessaire.',
  },
];

export const COMMUNITY_MAP_SOURCE = {
  title: 'Données de la carte : OpenStreetMap',
  url: 'https://www.openstreetmap.org/copyright',
  note: 'Données © contributeurs OpenStreetMap, sous licence ODbL. Les lieux et coordonnées proviennent d’une source communautaire, sans validation gouvernementale. Les horaires et l’accueil des urgences doivent être confirmés auprès des établissements.',
} as const;

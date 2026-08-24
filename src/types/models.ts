export type Language = 'fr' | 'bm';

export type EmergencyType =
  | 'medical'
  | 'accident'
  | 'agression'
  | 'incendie'
  | 'noyade'
  | 'autre';

export type Severity = 'faible' | 'moyen' | 'eleve' | 'critique';

export type Coordinates = {
  latitude: number;
  longitude: number;
  accuracy?: number;
};

export type EmergencyContact = {
  id?: number;
  name: string;
  phone: string;
};

export type MedicalProfile = {
  phone: string;
  name: string;
  bloodType: string;
  allergies: string;
  treatments: string;
  history: string;
  photoUri: string | null;
  includeInSos: boolean;
  updatedAt: number;
};

export type FirstAidStep = {
  id: string;
  fr: string;
  bm: string;
  durationSeconds?: number;
  icon: string;
  /** Relative path under assets/audio when a human recording exists. */
  bambaraAudio?: string;
  frenchAudio?: string;
};

export type FirstAidGuide = {
  id: string;
  title: string;
  bambaraTitle: string;
  icon: string;
  tone: 'alert' | 'amber' | 'green' | 'blue';
  summary: string;
  /** Bambara summary when language is Bamanankan. */
  summaryBm?: string;
  emergencyNumber?: string;
  /** Medical BM text still needs sign-off by a Bambara-speaking clinician. */
  bambaraReviewStatus?: 'pending_clinical_validation' | 'validated';
  steps: FirstAidStep[];
};

export type EmergencyNumber = {
  number: string;
  dialNumber: string;
  name: string;
  description: string;
  types: EmergencyType[];
  category: 'urgence' | 'orientation' | 'signalement' | 'alternative' | 'assistance' | 'service';
  scope: string;
  sourceLabel: string;
  sourceUrl: string;
  verifiedAt: string;
  status: 'official' | 'needs_field_verification';
};

export type FacilityCategory = 'hopital' | 'pharmacie' | 'police' | 'gendarmerie';

export type Facility = {
  id: string;
  name: string;
  category: FacilityCategory;
  latitude: number;
  longitude: number;
  phone?: string;
  hours?: string;
  city: string;
  isEmergency?: boolean;
  source?: 'openstreetmap';
  osmType?: 'node' | 'way' | 'relation';
  osmId?: number;
  verifiedAt?: string;
  status?: 'osm_current' | 'needs_field_verification';
};

export type MeshMessage = {
  id: string;
  emergencyType: EmergencyType;
  position: Coordinates | null;
  createdAt: number;
  hopsRemaining: number;
  initialTtl: number;
  severity: Severity;
  medicalSummary?: string;
  originHash: string;
  originPublicKey: string;
  originSignature: string;
};

export type WeatherSnapshot = {
  city: string;
  temperature: number;
  description: string;
  weatherCode: number;
  updatedAt: number;
  source: 'network' | 'cache' | 'fallback';
  precipitationProbability?: number;
};

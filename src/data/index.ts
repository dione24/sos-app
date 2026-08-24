import emergencyNumbers from '../../assets/data/emergency-numbers.json';
import firstAidGuides from '../../assets/data/first-aid-guides.json';
import healthFacilities from '../../assets/data/health-facilities.json';
import policeStations from '../../assets/data/police-stations.json';

import type { EmergencyNumber, Facility, FirstAidGuide } from '@/types/models';

export const EMERGENCY_NUMBERS = emergencyNumbers as EmergencyNumber[];
export const FIRST_AID_GUIDES = firstAidGuides as FirstAidGuide[];
export const FACILITIES = [...healthFacilities, ...policeStations] as Facility[];

export const getGuide = (id: string) => FIRST_AID_GUIDES.find((guide) => guide.id === id);

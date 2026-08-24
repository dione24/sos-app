import {
  BedSingle,
  Bone,
  Droplets,
  Flame,
  HeartCrack,
  HeartPulse,
  PersonStanding,
  ShieldAlert,
  Waves,
  Zap,
} from 'lucide-react-native';

const icons = {
  rcp: HeartPulse,
  hemorragie: Droplets,
  pls: BedSingle,
  brulure: Flame,
  etouffement: PersonStanding,
  serpent: ShieldAlert,
  'malaise-cardiaque': HeartCrack,
  noyade: Waves,
  electrocution: Zap,
  fracture: Bone,
} as const;

export function GuideIcon({ id, color, size = 24 }: { id: string; color: string; size?: number }) {
  const Icon = icons[id as keyof typeof icons] ?? ShieldAlert;
  return <Icon size={size} color={color} strokeWidth={2.3} />;
}

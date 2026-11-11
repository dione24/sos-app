import BedSingle from 'lucide-react-native/icons/bed-single';
import Bone from 'lucide-react-native/icons/bone';
import Droplets from 'lucide-react-native/icons/droplets';
import Flame from 'lucide-react-native/icons/flame';
import HeartCrack from 'lucide-react-native/icons/heart-crack';
import HeartPulse from 'lucide-react-native/icons/heart-pulse';
import PersonStanding from 'lucide-react-native/icons/person-standing';
import ShieldAlert from 'lucide-react-native/icons/shield-alert';
import Waves from 'lucide-react-native/icons/waves-horizontal';
import Zap from 'lucide-react-native/icons/zap';

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
  return <Icon size={size} color={color} strokeWidth={2} />;
}

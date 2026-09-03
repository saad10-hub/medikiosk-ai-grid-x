import type { AYUSHData } from '@/types';

export const AYUSH_FIELDS = [
  { key: 'prakriti', label: 'Prakriti (Body Constitution)', description: 'Vata, Pitta, Kapha, or combinations' },
  { key: 'vikriti', label: 'Vikriti (Current Imbalance)', description: 'Current dosha imbalance' },
  { key: 'agni', label: 'Agni (Digestive Fire)', description: 'Digestive capacity type' },
  { key: 'koshtha', label: 'Koshtha (Bowel Pattern)', description: 'Bowel movement pattern' },
  { key: 'ahara', label: 'Ahara (Diet)', description: 'Dietary habits' },
  { key: 'vihara', label: 'Vihara (Lifestyle)', description: 'Daily routine and lifestyle' },
  { key: 'nidana', label: 'Nidana (Causes)', description: 'Possible causes of illness' },
] as const;

export const DASHAVIDHA_PARIKSHA_FIELDS = [
  { key: 'dooshya', label: 'Dooshya (Disease-causing factors)' },
  { key: 'desha', label: 'Desha (Habitat/Climate)' },
  { key: 'kala', label: 'Kala (Time/Season)' },
  { key: 'prana', label: 'Prana (Vitality)' },
  { key: 'vikriti_samkhya', label: 'Vikriti Samkhya (Number of imbalances)' },
  { key: 'vikriti_prakriti', label: 'Vikriti Prakriti (Nature of imbalance)' },
  { key: 'sara', label: 'Sara (Quality of tissues)' },
  { key: 'samhanana', label: 'Samhanana (Body build)' },
  { key: 'pramana', label: 'Pramana (Body measurements)' },
  { key: 'satmya', label: 'Satmya (Wholesomeness/Habituation)' },
  { key: 'sattva', label: 'Sattva (Mental constitution)' },
] as const;

export function createEmptyAYUSHData(): AYUSHData {
  return {
    prakriti: '',
    vikriti: '',
    agni: '',
    koshtha: '',
    ahara: '',
    vihara: '',
    nidana: '',
    dashavidha_pariksha: {
      dooshya: '',
      desha: '',
      kala: '',
      prana: '',
      vikriti_samkhya: '',
      vikriti_prakriti: '',
      sara: '',
      samhanana: '',
      pramana: '',
      satmya: '',
      sattva: '',
    },
  };
}

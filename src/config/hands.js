export const HANDS = {
  LONE_PIP: { id: 'LONE_PIP', name: 'Lone Pip', chips: 10, mult: 1, desc: 'Any 1–4 dice' },
  DOUBLET: { id: 'DOUBLET', name: 'Doublet', chips: 25, mult: 2, desc: '2 matching dice (e.g. 4-4-2)' },
  ASCEND: { id: 'ASCEND', name: 'Ascend', chips: 45, mult: 4, desc: '3 consecutive dice (e.g. 2-3-4)' },
  CROSSED_DOUBLETS: { id: 'CROSSED_DOUBLETS', name: 'Crossed Doublets', chips: 60, mult: 5, desc: '2 pairs with 4 dice (e.g. 3-3-5-5)' },
  TRIO: { id: 'TRIO', name: 'Trio', chips: 75, mult: 6, desc: '3 matching dice (e.g. 5-5-5)' },
  GRAND_ASCEND: { id: 'GRAND_ASCEND', name: 'Grand Ascend', chips: 90, mult: 7, desc: '4 consecutive dice (e.g. 2-3-4-5)' },
  PERFECT_18: { id: 'PERFECT_18', name: 'Perfect 18', chips: 120, mult: 10, desc: 'Three sixes (6-6-6)' },
  QUARTET: { id: 'QUARTET', name: 'Quartet', chips: 150, mult: 12, desc: '4 matching dice (e.g. 6-6-6-6)' }
};

export const HAND_ORDER = [
  'LONE_PIP',
  'DOUBLET',
  'ASCEND',
  'CROSSED_DOUBLETS',
  'TRIO',
  'GRAND_ASCEND',
  'PERFECT_18',
  'QUARTET'
];

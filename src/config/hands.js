export const HANDS = {
  HIGH_DIE: { id: 'HIGH_DIE', name: 'High Die', chips: 10, mult: 1, desc: 'Any 1–3 dice' },
  PAIR: { id: 'PAIR', name: 'Pair', chips: 25, mult: 2, desc: '2 matching dice (e.g. 4-4-2)' },
  SMALL_STRAIGHT: { id: 'SMALL_STRAIGHT', name: 'Small Straight', chips: 45, mult: 4, desc: '3 consecutive dice (e.g. 2-3-4)' },
  THREE_OF_A_KIND: { id: 'THREE_OF_A_KIND', name: 'Three of a Kind', chips: 75, mult: 6, desc: '3 matching dice (e.g. 5-5-5)' },
  PERFECT_18: { id: 'PERFECT_18', name: 'Perfect 18', chips: 120, mult: 10, desc: 'Three sixes (6-6-6)' }
};

export const HAND_ORDER = ['HIGH_DIE', 'PAIR', 'SMALL_STRAIGHT', 'THREE_OF_A_KIND', 'PERFECT_18'];

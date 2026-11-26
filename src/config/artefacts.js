export const ARTEFACT_CATALOG = [
  {
    id: 'RED_CROWN',
    name: 'Red Crown',
    short: 'MULT',
    color: '#FB7185',
    accent: '#FFE4E6',
    spriteIdx: 0,
    desc: 'Leftmost modifier card triggers x4 Mult, but odd pips score 0 Base Points.'
  },
  {
    id: 'GREED_CURSE',
    name: 'Greed Curse',
    short: 'ECON',
    color: '#FBBF24',
    accent: '#FEF3C7',
    spriteIdx: 1,
    desc: 'Gain +$5 income at Cash Out every stage, but -1 Hand per stage.'
  },
  {
    id: 'SLIMEBALL',
    name: 'Slimeball',
    short: 'MULT',
    color: '#4ADE80',
    accent: '#DCFCE7',
    spriteIdx: 2,
    desc: 'x2 Mult for each 4 scored in the played hand.'
  },
  {
    id: 'ALCHEMY_BELT',
    name: 'Alchemy Belt',
    short: '+1 POTION SLOT',
    color: '#38BDF8',
    accent: '#E0F2FE',
    spriteIdx: 5,
    desc: 'Permanently grants +1 Consumable Potion slot in your belt.'
  },
  {
    id: 'BONE',
    name: 'The Bone',
    short: 'MULT',
    color: '#E2E8F0',
    accent: '#F8FAFC',
    spriteIdx: 7,
    desc: 'x1.5 Mult for each unplayed die left on the table, but -1 die per hand.'
  },
  {
    id: 'PUCH',
    name: 'Loaded Pouch',
    short: 'ECON',
    color: '#F59E0B',
    accent: '#FDE68A',
    spriteIdx: 9,
    desc: '+$8 additional gold per round at Cash Out, but you lose $2 per played hand.'
  },
  {
    id: 'SWORD',
    name: 'Rusty Sword',
    short: 'MULT',
    color: '#F87171',
    accent: '#FECACA',
    spriteIdx: 4,
    desc: '-20 Mult per hand, but +160 Mult on the last hand of the round.'
  },
  {
    id: 'CRACKED_CUP',
    name: 'Cracked Cup',
    short: 'ROLL',
    color: '#60A5FA',
    accent: '#DBEAFE',
    spriteIdx: 6,
    desc: '+1 Reroll, +10 Mult per used reroll this round, but 25% chance each die will not roll.'
  },
  {
    id: 'PENNY',
    name: 'Lucky Penny',
    short: 'ECON',
    color: '#FACC15',
    accent: '#FEF08A',
    spriteIdx: 8,
    desc: 'Playing a 5 or 6 gives +$1, but playing a 1, 2, or 3 gives -$1.'
  },
  {
    id: 'WEIGHTED_DIE',
    name: 'Weighted Die',
    short: 'HAND',
    color: '#A78BFA',
    accent: '#EDE9FE',
    spriteIdx: 5,
    desc: 'You permanently have 0 Rerolls, but +3 Hands per round.'
  },
  {
    id: 'DIAMOND',
    name: 'Shining Diamond',
    short: 'LUCK',
    color: '#2DD4BF',
    accent: '#CCFBF1',
    spriteIdx: 10,
    desc: 'Greatly increases the chance of spawning coloured edition cards (Gilded, Crimson-Lit, Prism-Cut, Void-Etched).'
  }
];

export const ARTEFACT_BY_ID = Object.fromEntries(ARTEFACT_CATALOG.map(a => [a.id, a]));

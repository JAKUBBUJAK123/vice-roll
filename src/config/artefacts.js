export const ARTEFACT_CATALOG = [
  {
    id: 'RED_CROWN',
    name: 'Red Crown',
    short: 'LEFT x4 / NO ODD',
    color: '#FB7185',
    accent: '#FFE4E6',
    desc: 'Leftmost modifier card triggers x4 Mult, but odd pips score 0 Base Points.'
  },
  {
    id: 'GREED_CURSE',
    name: 'Greed Curse',
    short: '+$5 / -1 HAND',
    color: '#FBBF24',
    accent: '#FEF3C7',
    desc: 'Gain +$5 income at Cash Out every stage, but -1 Hand per stage.'
  },
  {
    id: 'SLIMEBALL',
    name: 'Slimeball',
    short: '4s → x2 MULT',
    color: '#4ADE80',
    accent: '#DCFCE7',
    desc: 'x2 Mult for each 4 scored in the played hand.'
  },
  {
    id: 'ALCHEMY_BELT',
    name: 'Alchemy Belt',
    short: '+1 POTION SLOT',
    color: '#38BDF8',
    accent: '#E0F2FE',
    desc: 'Permanently grants +1 Consumable Potion slot in your belt.'
  }
];

export const ARTEFACT_BY_ID = Object.fromEntries(ARTEFACT_CATALOG.map(a => [a.id, a]));

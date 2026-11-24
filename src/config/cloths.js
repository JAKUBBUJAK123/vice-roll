export const CLOTH_CATALOG = [
  {
    id: 'BLUE',
    name: 'Blue Cloth',
    spriteIdx: 0,
    color: '#38BDF8',
    tag: 'STANDARD',
    desc: 'Classic royal blue parlor weave trimmed with brass filigree.'
  },
  {
    id: 'CRIMSON_VELVET',
    name: 'Crimson Velvet',
    spriteIdx: 1,
    color: '#FB7185',
    tag: 'MULT',
    desc: 'Deep burgundy felt with ivory trim. You start with 4 arcana slots, x2 mult for each occupied slot.'
  },
  {
    id: 'GILDED_IVORY',
    name: 'Gilded Ivory',
    spriteIdx: 2,
    color: '#FACC15',
    tag: 'MYTH',
    desc: 'Lustrous ivory silk bordered in pure gold leaf. Start with random ticket.'
  },
  {
    id: 'ARCANE_TEAL',
    name: 'Mythic Teal',
    spriteIdx: 3,
    color: '#2DD4BF',
    tag: 'MYTH',
    desc: 'Midnight violet cloth infused with seafoam thread. Start with random artefact, +1 artefact slot, -1hand -1toss.'
  },
  {
    id: 'WITCH_CLOTH',
    name: 'Witch cloth',
    spriteIdx: 4,
    color: '#34D399',
    tag: 'MYTH',
    desc: 'Traditional tournament emerald baize. Start with random potion, +1 potion slot, -1toss.'
  },
  {
    id: 'PALLADINS_CLOTH',
    name: 'Palladins cloth',
    spriteIdx: 5,
    color: '#7DD3FC',
    tag: 'GOD',
    desc: 'Cool slate-blue linen framed in cream. You cannot get boss debuff, higher score needed to win, +1 hand.'
  },
  {
    id: 'WHITE_SILK',
    name: 'White Silk',
    spriteIdx: 6,
    color: '#CBD5E1',
    tag: 'ECON',
    desc: 'Charcoal-ash herringbone weave with silver edge. +20 gold at the begining, bigger gold income, -1hand -1 toss.'
  }
];

export const CLOTH_BY_ID = Object.fromEntries(CLOTH_CATALOG.map(c => [c.id, c]));

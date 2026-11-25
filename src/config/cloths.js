export const CLOTH_CATALOG = [
  {
    id: 'BLUE',
    name: 'Blue Cloth',
    spriteIdx: 0,
    color: '#38BDF8',
    tag: 'STANDARD',
    desc: 'Classic royal blue parlor weave trimmed with brass filigree. Unchanged house rules for clean, balanced rolls.'
  },
  {
    id: 'CRIMSON_VELVET',
    name: 'Crimson Velvet',
    spriteIdx: 1,
    color: '#FB7185',
    tag: 'MULT',
    desc: 'Deep burgundy felt with ivory trim. Start with 4 Arcana slots; each occupied slot grants x2 Mult.'
  },
  {
    id: 'GILDED_IVORY',
    name: 'Gilded Ivory',
    spriteIdx: 2,
    color: '#FACC15',
    tag: 'MYTH',
    desc: 'Lustrous ivory silk bordered in pure gold leaf. Begin the run with a random Ticket already in hand.'
  },
  {
    id: 'MYTHIC_TEAL',
    name: 'Mythic Teal',
    spriteIdx: 3,
    color: '#2DD4BF',
    tag: 'MYTH',
    desc: 'Midnight violet cloth infused with seafoam thread. Start with a random Artefact and +1 Artefact slot, but -1 Hand and -1 Toss.'
  },
  {
    id: 'WITCH_CLOTH',
    name: 'Witch cloth',
    spriteIdx: 4,
    color: '#34D399',
    tag: 'MYTH',
    desc: 'Traditional tournament emerald baize. Start with a random Potion and +1 Potion slot, at the cost of -1 Toss.'
  },
  {
    id: 'PALLADINS_CLOTH',
    name: 'Palladins cloth',
    spriteIdx: 5,
    color: '#7DD3FC',
    tag: 'GOD',
    desc: 'Cool slate-blue linen framed in cream. Immune to Boss debuffs and +1 Hand, but target scores are raised.'
  },
  {
    id: 'WHITE_SILK',
    name: 'White Silk',
    spriteIdx: 6,
    color: '#CBD5E1',
    tag: 'ECON',
    desc: 'Charcoal-ash herringbone weave with silver edge. +20 Gold at start and higher Gold payouts, but -1 Hand and -1 Toss.'
  }
];
export const CLOTH_BY_ID = Object.fromEntries(CLOTH_CATALOG.map(c => [c.id, c]));

export const DIFFICULTY_CATALOG = [
  {
    id: 'OPEN_TABLE',
    name: 'Open Table',
    spriteIdx: 0,
    color: '#34D399',
    targetMult: 1,
    rerollDelta: 0,
    rerollCostAdd: 0,
    priceAdd: 0,
    desc: 'Standard house rules & normal chapter goals.'
  },
  {
    id: 'HOUSE_CUT',
    name: 'House Cut',
    spriteIdx: 1,
    color: '#FACC15',
    tag: 'MODIFIER',
    targetMult: 1.25,
    rerollDelta: 0,
    rerollCostAdd: 0,
    priceAdd: 0,
    desc: '1.25× chapter target scores.'
  },
  {
    id: 'CROUPIERS_TAX',
    name: "Croupier's Tax",
    spriteIdx: 2,
    color: '#FB923C',
    targetMult: 1.4,
    rerollDelta: 0,
    rerollCostAdd: 1,
    priceAdd: 1,
    desc: '1.4× goals, +$1 reroll, card & gem prices.'
  },
  {
    id: 'NO_MERCY',
    name: 'No Mercy',
    spriteIdx: 3,
    color: '#FB7185',
    targetMult: 1.75,
    rerollDelta: -1,
    rerollCostAdd: 1,
    priceAdd: 1,
    desc: '1.75× goals, -1 Reroll & +$1 shop prices.'
  }
];

export const DIFFICULTY_BY_ID = Object.fromEntries(DIFFICULTY_CATALOG.map(d => [d.id, d]));

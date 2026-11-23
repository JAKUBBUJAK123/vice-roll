export const TICKET_COST = 10;

export const TICKET_CATALOG = [
  {
    id: 'HEAVY_CUP',
    name: 'Heavy Cup',
    tag: '+1 POOL DIE',
    desc: 'Increases rolled dice pool by +1 die (up to 7 max).',
    icon: '🎲',
    color: '#2DD4BF',
    maxStacks: 2
  },
  {
    id: 'WIDE_GRIP',
    name: 'Wide Grip',
    tag: '+1 COMBO DIE',
    desc: 'Increases max selectable dice per hand from 3 to 4 (unlocks 4-dice hands!).',
    icon: '🖐',
    color: '#F472B6',
    maxStacks: 1
  },
  {
    id: 'LOADED_WRIST',
    name: 'Loaded Wrist',
    tag: '+1 REROLL',
    desc: 'Permanently grants +1 Reroll every stage.',
    icon: '↻',
    color: '#F5CD79',
    maxStacks: 3
  },
  {
    id: 'EXTRA_SLEEVE',
    name: 'Extra Sleeve',
    tag: '+1 HAND',
    desc: 'Permanently grants +1 Hand every stage.',
    icon: '♠',
    color: '#38BDF8',
    maxStacks: 3
  },
  {
    id: 'CARD_SHARK',
    name: 'Card Shark',
    tag: '+1 CARD SLOT',
    desc: 'Increases max active modifier card slots by +1.',
    icon: '♦',
    color: '#C084FC',
    maxStacks: 2
  },
  {
    id: 'VIP_PASS',
    name: 'VIP Pass',
    tag: '+1 SHOP SLOT',
    desc: 'Adds +1 extra card slot in the Parlor Bazaar.',
    icon: '★',
    color: '#FEF08A',
    maxStacks: 1
  }
];

export const TICKET_BY_ID = Object.fromEntries(TICKET_CATALOG.map(t => [t.id, t]));

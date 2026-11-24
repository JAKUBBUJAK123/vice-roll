export const TICKET_COST = 10;

export const TICKET_CATALOG = [
  {
    id: 'HEAVY_CUP',
    name: 'Heavy Cup',
    tag: '+1 POOL DIE',
    desc: 'Increases rolled dice pool by +1 die (up to 7 max).',
    spriteIdx: 9,
    color: '#2DD4BF',
    maxStacks: 2
  },
  {
    id: 'WIDE_GRIP',
    name: 'Wide Grip',
    tag: '+1 COMBO DIE',
    desc: 'Increases max selectable dice per hand from 3 to 4.',
    spriteIdx: 8,
    color: '#F472B6',
    maxStacks: 1
  },
  {
    id: 'LOADED_WRIST',
    name: 'Loaded Wrist',
    tag: '+1 REROLL',
    desc: 'Permanently grants +1 Reroll every stage.',
    spriteIdx: 7,
    color: '#F5CD79',
    maxStacks: 3
  },
  {
    id: 'EXTRA_SLEEVE',
    name: 'Extra Sleeve',
    tag: '+1 HAND',
    desc: 'Permanently grants +1 Hand every stage.',
    spriteIdx: 5,
    color: '#38BDF8',
    maxStacks: 3
  },
  {
    id: 'CARD_SHARK',
    name: 'Card Shark',
    tag: '+1 CARD SLOT',
    desc: 'Increases max active modifier card slots by +1.',
    spriteIdx: 6,
    color: '#C084FC',
    maxStacks: 2
  },
  {
    id: 'VIP_PASS',
    name: 'VIP Pass',
    tag: '+1 SHOP SLOT',
    desc: 'Adds +1 extra card slot in the Parlor Bazaar.',
    spriteIdx: 4,
    color: '#FEF08A',
    maxStacks: 1
  },
  {
    id: 'LUCKY_CLOVER',
    name: 'Lucky Clover',
    tag: '+RARE/EPIC ODDS',
    desc: 'Increases the chance of Rare and Epic cards appearing in the Bazaar.',
    spriteIdx: 0,
    color: '#4ADE80',
    maxStacks: 2
  },
  {
    id: 'RELIC_RACK',
    name: 'Relic Rack',
    tag: '+1 ARTEFACT SLOT',
    desc: 'Permanently grants +1 Artefact slot.',
    spriteIdx: 1,
    color: '#FBBF24',
    maxStacks: 2
  },
  {
    id: 'MEMBER_CARD',
    name: 'Member Card',
    tag: 'CHEAPER REROLLS',
    desc: 'Reduces Bazaar reroll prices by $2 (min $1).',
    spriteIdx: 2,
    color: '#38BDF8',
    maxStacks: 2
  },
  {
    id: 'CRYSTALLOGRAPHER',
    name: 'Crystallographer',
    tag: '2x GEM EFFECTS',
    desc: 'Doubles the effects of all crystal die face upgrades (Ruby, Sapphire, Topaz, Emerald).',
    spriteIdx: 3,
    color: '#E879F9',
    maxStacks: 1
  }
];

export const TICKET_BY_ID = Object.fromEntries(TICKET_CATALOG.map(t => [t.id, t]));

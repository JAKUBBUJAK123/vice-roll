export const MAX_POTION_SLOTS = 3;

export const POTION_CATALOG = [
  {
    id: 'STRENGTH',
    name: 'Strength Potion',
    short: 'x5 SCORE',
    spriteIdx: 0,
    color: '#FB7185',
    liquid: '#E11D48',
    accent: '#FDA4AF',
    sellPrice: 3,
    desc: 'Multiplies your next played hand score by x5.'
  },
  {
    id: 'CLEANSE',
    name: 'Cleanse Potion',
    short: 'NO CURSE',
    spriteIdx: 1,
    color: '#34D399',
    liquid: '#059669',
    accent: '#A7F3D0',
    sellPrice: 3,
    desc: 'Removes the active Boss Curse from the current stage.'
  },
  {
    id: 'SHINE',
    name: 'Shine Potion',
    short: 'HAND',
    spriteIdx: 2,
    color: '#7DD3FC',
    liquid: '#0284C7',
    accent: '#E0F2FE',
    sellPrice: 3,
    desc: 'Grants +2 Hands for the current stage.'
  },
  {
    id: 'ECHO',
    name: 'Echo Tonic',
    short: 'RETRIGGER',
    spriteIdx: 3,
    color: '#2DD4BF',
    liquid: '#0D9488',
    accent: '#99F6E4',
    sellPrice: 3,
    desc: 'Retriggers all dice in your next played hand.'
  },
  {
    id: 'Gilded_Tonic',
    name: 'Gilded Tonic',
    short: 'ECON',
    spriteIdx: 4,
    color: '#FACC15',
    liquid: '#CA8A04',
    accent: '#FEF08A',
    sellPrice: 3,
    desc: 'Earn +$5 for each played hand this stage.'
  },
  {
    id: 'WIND',
    name: 'Second Wind',
    short: 'REROLLS',
    spriteIdx: 5,
    color: '#6EE7B7',
    liquid: '#10B981',
    accent: '#D1FAE5',
    sellPrice: 3,
    desc: 'Grants +2 Rerolls for the current stage.'
  },
  {
    id: 'INFERNO',
    name: 'Inferno Potion',
    short: 'COMBO',
    spriteIdx: 6,
    color: '#FB923C',
    liquid: '#EA580C',
    accent: '#FED7AA',
    sellPrice: 3,
    desc: 'Doubles all hand combination combo values current stage.'
  },
  {
    id: 'GHOST',
    name: 'Ghost Brew',
    short: 'GOAL',
    spriteIdx: 7,
    color: '#A78BFA',
    liquid: '#6D28D9',
    accent: '#DDD6FE',
    sellPrice: 3,
    desc: 'Reduces the current stage target score goal by 20%.'
  },
  {
    id: 'PANORAMIX',
    name: 'Panoramix Cauldron',
    short: 'CHAOS',
    spriteIdx: 8,
    color: '#F59E0B',
    liquid: '#B45309',
    accent: '#FDE68A',
    sellPrice: 3,
    desc: 'Spawns a random Arcana modifier card directly into your card dock.'
  },
  {
    id: 'PSYHO',
    name: 'Psyho Tonic',
    short: 'ALL 6s',
    spriteIdx: 9,
    color: '#E879F9',
    liquid: '#C026D3',
    accent: '#F5D0FE',
    sellPrice: 3,
    desc: 'Transforms every die to a 6'
  }
];

export const POTION_BY_ID = Object.fromEntries(POTION_CATALOG.map(p => [p.id, p]));

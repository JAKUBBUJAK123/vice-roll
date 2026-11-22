export const MAX_POTION_SLOTS = 3;

export const POTION_CATALOG = [
  {
    id: 'STRENGTH',
    name: 'Strength Potion',
    short: 'x5 SCORE',
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
    color: '#34D399',
    liquid: '#059669',
    accent: '#A7F3D0',
    sellPrice: 3,
    desc: 'Removes the active Boss Curse from the current stage.'
  }
];

export const POTION_BY_ID = Object.fromEntries(POTION_CATALOG.map(p => [p.id, p]));

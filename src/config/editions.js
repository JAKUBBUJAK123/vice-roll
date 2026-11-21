export const EDITIONS = {
  standard: {
    id: 'standard', name: 'Standard', short: 'STD', weight: 80, priceAdd: 0,
    color: '#CBD5E1', bonusText: ''
  },
  foil: {
    id: 'foil', name: 'Gilded-Bound', short: 'GILD', weight: 8, priceAdd: 2,
    color: '#F5CD79', bonusText: '+50 Base Points when triggered'
  },
  holographic: {
    id: 'holographic', name: 'Crimson-Lit', short: 'EMBER', weight: 7, priceAdd: 2,
    color: '#FB7185', bonusText: '+12 Mult when triggered'
  },
  polychrome: {
    id: 'polychrome', name: 'Prism-Cut', short: 'PRISM', weight: 3, priceAdd: 3,
    color: '#E0F2FE', bonusText: 'x1.5 Mult when triggered'
  },
  negative: {
    id: 'negative', name: 'Void-Etched', short: 'VOID', weight: 2, priceAdd: 3,
    color: '#5EEAD4', bonusText: '+1 Max Card Slot (uses 0 slots)'
  }
};

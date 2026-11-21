export const EDITIONS = {
  standard: {
    id: 'standard', name: 'Standard', weight: 80, priceAdd: 0,
    color: '#CBD5E1', bonusText: ''
  },
  foil: {
    id: 'foil', name: 'Foil', weight: 8, priceAdd: 2,
    color: '#60A5FA', bonusText: '+50 Chips when triggered'
  },
  holographic: {
    id: 'holographic', name: 'Holographic', weight: 7, priceAdd: 2,
    color: '#F472B6', bonusText: '+12 Mult when triggered'
  },
  polychrome: {
    id: 'polychrome', name: 'Polychrome', weight: 3, priceAdd: 3,
    color: '#C084FC', bonusText: 'x1.5 Mult when triggered'
  },
  negative: {
    id: 'negative', name: 'Negative', weight: 2, priceAdd: 3,
    color: '#38BDF8', bonusText: '+1 Max Card Slot (uses 0 slots)'
  }
};

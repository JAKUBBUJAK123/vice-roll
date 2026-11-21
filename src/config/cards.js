import { COLORS } from './colors.js';

export const SUIT_SYMBOLS = {
  spades: '♠',
  hearts: '♥',
  diamonds: '♦',
  clubs: '♣'
};

// 18 Distinct Standard Playing Cards (all 12 prompt cards verbatim + 6 synergistic additions)
export const CARD_CATALOG = [
  {
    id: 'KS', rank: 'K', suit: 'spades', name: 'King of Spades', rarity: 'rare', basePrice: 6,
    tag: 'x2 / EVEN',
    desc: 'x2 Mult for each even die in the played hand.',
    evaluate(inst, ctx) {
      const events = [];
      for (const d of ctx.scoredDice) {
        if (d.value % 2 === 0) {
          events.push({ multMul: 2, label: 'x2 Mult', color: COLORS.multLight, sfx: 'xmult', dieId: d.id });
        }
      }
      return events;
    }
  },
  {
    id: 'AH', rank: 'A', suit: 'hearts', name: 'Ace of Hearts', rarity: 'uncommon', basePrice: 5,
    tag: '+20M / 3',
    desc: '+20 Mult for each 3 in the played hand.',
    evaluate(inst, ctx) {
      const events = [];
      for (const d of ctx.scoredDice) {
        if (d.value === 3) {
          events.push({ multAdd: 20, label: '+20 Mult', color: COLORS.multLight, sfx: 'mult', dieId: d.id });
        }
      }
      return events;
    }
  },
  {
    id: '7D', rank: '7', suit: 'diamonds', name: '7 of Diamonds', rarity: 'common', basePrice: 4,
    tag: 'SUM 7 / 14',
    desc: '+50 Chips and +$2 if the played dice sum to 7 or 14.',
    evaluate(inst, ctx) {
      if (ctx.playedSum === 7 || ctx.playedSum === 14) {
        return [{ chipsAdd: 50, moneyAdd: 2, label: '+50 & +$2', color: COLORS.goldLight, sfx: 'money' }];
      }
      return [];
    }
  },
  {
    id: 'JC', rank: 'J', suit: 'clubs', name: 'Jack of Clubs', rarity: 'uncommon', basePrice: 5,
    tag: 'RETRIG 1st',
    desc: 'Retriggers the first scored die an additional time.',
    retriggerFirst: true,
    evaluate() { return []; }
  },
  {
    id: 'QS', rank: 'Q', suit: 'spades', name: 'Queen of Spades', rarity: 'uncommon', basePrice: 5,
    tag: '+15M / UNPL',
    desc: '+15 Mult for each unplayed die left on the table.',
    evaluate(inst, ctx) {
      if (ctx.unplayedCount > 0) {
        const total = ctx.unplayedCount * 15;
        return [{ multAdd: total, label: '+' + total + ' Mult', color: COLORS.multLight, sfx: 'mult' }];
      }
      return [];
    }
  },
  {
    id: '10H', rank: '10', suit: 'hearts', name: '10 of Hearts', rarity: 'uncommon', basePrice: 5,
    tag: 'x1.5 STR',
    desc: 'x1.5 Mult if the played hand is a Small Straight.',
    evaluate(inst, ctx) {
      if (ctx.hand.id === 'SMALL_STRAIGHT') {
        return [{ multMul: 1.5, label: 'x1.5 Mult', color: COLORS.multLight, sfx: 'xmult' }];
      }
      return [];
    }
  },
  {
    id: '2C', rank: '2', suit: 'clubs', name: '2 of Clubs', rarity: 'common', basePrice: 4,
    tag: '+12M / 1-2',
    desc: '+12 Mult for every 1 or 2 scored.',
    evaluate(inst, ctx) {
      const events = [];
      for (const d of ctx.scoredDice) {
        if (d.value === 1 || d.value === 2) {
          events.push({ multAdd: 12, label: '+12 Mult', color: COLORS.multLight, sfx: 'mult', dieId: d.id });
        }
      }
      return events;
    }
  },
  {
    id: 'AS', rank: 'A', suit: 'spades', name: 'Ace of Spades', rarity: 'common', basePrice: 4,
    tag: '+100C ODD',
    desc: '+100 Chips if all played dice are odd.',
    evaluate(inst, ctx) {
      if (ctx.playedDice.length > 0 && ctx.playedDice.every(d => d.value % 2 === 1)) {
        return [{ chipsAdd: 100, label: '+100 Chips', color: COLORS.chipsLight, sfx: 'chips' }];
      }
      return [];
    }
  },
  {
    id: 'KD', rank: 'K', suit: 'diamonds', name: 'King of Diamonds', rarity: 'rare', basePrice: 6,
    tag: 'x3 TRIPS',
    desc: 'x3 Mult if the played hand is Three of a Kind (or Perfect 18).',
    evaluate(inst, ctx) {
      if (ctx.hand.id === 'THREE_OF_A_KIND' || ctx.hand.id === 'PERFECT_18') {
        return [{ multMul: 3, label: 'x3 Mult', color: COLORS.multLight, sfx: 'xmult' }];
      }
      return [];
    }
  },
  {
    id: '5H', rank: '5', suit: 'hearts', name: '5 of Hearts', rarity: 'uncommon', basePrice: 5,
    tag: '+4M PER 5',
    desc: '+4 Mult permanently gained every time a 5 is scored.',
    isScaling: true,
    evaluate(inst, ctx) {
      const events = [];
      let fives = 0;
      for (const d of ctx.scoredDice) {
        if (d.value === 5) {
          fives++;
          events.push({ scaleAdd: 4, label: 'Upgrade +4!', color: COLORS.goldLight, sfx: 'money', dieId: d.id });
        }
      }
      const totalMult = (inst.scalingBonus || 0) + fives * 4;
      if (totalMult > 0) {
        events.push({ multAdd: totalMult, label: '+' + totalMult + ' Mult', color: COLORS.multLight, sfx: 'mult' });
      }
      return events;
    }
  },
  {
    id: '8S', rank: '8', suit: 'spades', name: '8 of Spades', rarity: 'uncommon', basePrice: 5,
    tag: 'x2 0-ROLL',
    desc: 'x2 Mult if you have 0 Rerolls remaining.',
    evaluate(inst, ctx) {
      if (ctx.rerollsLeft === 0) {
        return [{ multMul: 2, label: 'x2 Mult', color: COLORS.multLight, sfx: 'xmult' }];
      }
      return [];
    }
  },
  {
    id: 'QH', rank: 'Q', suit: 'hearts', name: 'Queen of Hearts', rarity: 'rare', basePrice: 6,
    tag: '+30C +8M /6',
    desc: '+30 Chips and +8 Mult for each 6 scored.',
    evaluate(inst, ctx) {
      const events = [];
      for (const d of ctx.scoredDice) {
        if (d.value === 6) {
          events.push({ chipsAdd: 30, multAdd: 8, label: '+30C +8M', color: COLORS.multLight, sfx: 'mult', dieId: d.id });
        }
      }
      return events;
    }
  },
  {
    id: '4D', rank: '4', suit: 'diamonds', name: '4 of Diamonds', rarity: 'common', basePrice: 4,
    tag: '+40C PAIR+',
    desc: '+40 Chips if the played hand is a Pair or better.',
    evaluate(inst, ctx) {
      if (ctx.hand.id !== 'HIGH_DIE') {
        return [{ chipsAdd: 40, label: '+40 Chips', color: COLORS.chipsLight, sfx: 'chips' }];
      }
      return [];
    }
  },
  {
    id: '9C', rank: '9', suit: 'clubs', name: '9 of Clubs', rarity: 'common', basePrice: 4,
    tag: '+$3 SUM 12+',
    desc: 'Earn +$3 if your played dice sum to 12 or higher.',
    evaluate(inst, ctx) {
      if (ctx.playedSum >= 12) {
        return [{ moneyAdd: 3, label: '+$3', color: COLORS.goldLight, sfx: 'money' }];
      }
      return [];
    }
  },
  {
    id: 'JD', rank: 'J', suit: 'diamonds', name: 'Jack of Diamonds', rarity: 'uncommon', basePrice: 5,
    tag: '+6C PER $1',
    desc: '+6 Chips for every $1 in your bankroll when played.',
    evaluate(inst, ctx) {
      const bonus = ctx.money * 6;
      if (bonus > 0) {
        return [{ chipsAdd: bonus, label: '+' + bonus + ' Chips', color: COLORS.chipsLight, sfx: 'chips' }];
      }
      return [];
    }
  },
  {
    id: '3C', rank: '3', suit: 'clubs', name: '3 of Clubs', rarity: 'uncommon', basePrice: 5,
    tag: 'x1.5 UNIQ',
    desc: 'x1.5 Mult if 3 dice are played and all 3 show different numbers.',
    evaluate(inst, ctx) {
      if (ctx.playedDice.length === 3) {
        const vals = new Set(ctx.playedDice.map(d => d.value));
        if (vals.size === 3) {
          return [{ multMul: 1.5, label: 'x1.5 Mult', color: COLORS.multLight, sfx: 'xmult' }];
        }
      }
      return [];
    }
  },
  {
    id: '6S', rank: '6', suit: 'spades', name: '6 of Spades', rarity: 'rare', basePrice: 6,
    tag: 'RETRIG 6s',
    desc: 'Retriggers every scored 6 an additional time.',
    retriggerSix: true,
    evaluate() { return []; }
  },
  {
    id: 'AD', rank: 'A', suit: 'diamonds', name: 'Ace of Diamonds', rarity: 'rare', basePrice: 6,
    tag: 'x2.5 FINAL',
    desc: 'x2.5 Mult when played on your final Hand of the stage.',
    evaluate(inst, ctx) {
      if (ctx.handsLeftAfterPlay === 0) {
        return [{ multMul: 2.5, label: 'x2.5 Mult', color: COLORS.multLight, sfx: 'xmult' }];
      }
      return [];
    }
  }
];

export const CARD_BY_ID = Object.fromEntries(CARD_CATALOG.map(c => [c.id, c]));

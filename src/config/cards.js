import { COLORS } from './colors.js';

export const SUIT_SYMBOLS = {
  spades: '♠',
  hearts: '♥',
  diamonds: '♦',
  clubs: '♣'
};

export const CARD_CATALOG = [
  {
    id: 'KS', rank: 'K', suit: 'spades', name: 'King of Spades', rarity: 'rare', basePrice: 6,
    tag: 'MULT',
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
    tag: 'MULT',
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
    tag: 'ECON',
    desc: '+50 Points and +$2 if the played dice sum to 7 or 14.',
    evaluate(inst, ctx) {
      if (ctx.playedSum === 7 || ctx.playedSum === 14) {
        return [{ chipsAdd: 50, moneyAdd: 2, label: '+50 & +$2', color: COLORS.goldLight, sfx: 'money' }];
      }
      return [];
    }
  },
  {
    id: 'JC', rank: 'J', suit: 'clubs', name: 'Jack of Clubs', rarity: 'uncommon', basePrice: 5,
    tag: 'TRIGGER',
    desc: 'Retriggers the first scored die an additional time.',
    retriggerFirst: true,
    evaluate() { return []; }
  },
  {
    id: 'QS', rank: 'Q', suit: 'spades', name: 'Queen of Spades', rarity: 'uncommon', basePrice: 5,
    tag: 'MULT',
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
    tag: 'MULT',
    desc: 'x1.5 Mult if the played hand is a Ascend or Grand Ascend.',
    evaluate(inst, ctx) {
      if (ctx.hand.id === 'ASCEND' || ctx.hand.id === 'GRAND_ASCEND') {
        return [{ multMul: 1.5, label: 'x1.5 Mult', color: COLORS.multLight, sfx: 'xmult' }];
      }
      return [];
    }
  },
  {
    id: '2C', rank: '2', suit: 'clubs', name: '2 of Clubs', rarity: 'common', basePrice: 4,
    tag: 'MULT',
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
    tag: 'POINTS',
    desc: '+100 Points if all played dice are odd.',
    evaluate(inst, ctx) {
      if (ctx.playedDice.length > 0 && ctx.playedDice.every(d => d.value % 2 === 1)) {
        return [{ chipsAdd: 100, label: '+100 Points', color: COLORS.chipsLight, sfx: 'chips' }];
      }
      return [];
    }
  },
  {
    id: 'KD', rank: 'K', suit: 'diamonds', name: 'King of Diamonds', rarity: 'rare', basePrice: 6,
    tag: 'MULT',
    desc: 'x3 Mult if the played hand is Trio, Perfect 18, or Quartet.',
    evaluate(inst, ctx) {
      if (ctx.hand.id === 'TRIO' || ctx.hand.id === 'PERFECT_18' || ctx.hand.id === 'QUARTET') {
        return [{ multMul: 3, label: 'x3 Mult', color: COLORS.multLight, sfx: 'xmult' }];
      }
      return [];
    }
  },
  {
    id: '5H', rank: '5', suit: 'hearts', name: '5 of Hearts', rarity: 'uncommon', basePrice: 5,
    tag: 'MULT',
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
    tag: 'MULT',
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
    tag: 'MULT',
    desc: '+30 POINTS and +8 Mult for each 6 scored.',
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
    tag: 'POINTS',
    desc: '+40 POINTS if the played hand is a Doublet or better.',
    evaluate(inst, ctx) {
      if (ctx.hand.id !== 'LONE_PIP') {
        return [{ chipsAdd: 40, label: '+40 Points', color: COLORS.chipsLight, sfx: 'chips' }];
      }
      return [];
    }
  },
  {
    id: '9C', rank: '9', suit: 'clubs', name: '9 of Clubs', rarity: 'common', basePrice: 4,
    tag: 'ECON',
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
    tag: 'ECON',
    desc: '+6 POINTS for every $1 in your bankroll when played.',
    evaluate(inst, ctx) {
      const bonus = ctx.money * 6;
      if (bonus > 0) {
        return [{ chipsAdd: bonus, label: '+' + bonus + ' Points', color: COLORS.chipsLight, sfx: 'chips' }];
      }
      return [];
    }
  },
  {
    id: '3C', rank: '3', suit: 'clubs', name: '3 of Clubs', rarity: 'uncommon', basePrice: 5,
    tag: 'UNIQUE',
    desc: 'x1.5 Mult if at least 3 dice are played and all show different numbers.',
    evaluate(inst, ctx) {
      if (ctx.playedDice.length >= 3) {
        const vals = new Set(ctx.playedDice.map(d => d.value));
        if (vals.size === ctx.playedDice.length) {
          return [{ multMul: 1.5, label: 'x1.5 Mult', color: COLORS.multLight, sfx: 'xmult' }];
        }
      }
      return [];
    }
  },
  {
    id: '6S', rank: '6', suit: 'spades', name: '6 of Spades', rarity: 'rare', basePrice: 6,
    tag: 'TRIGGER',
    desc: 'Retriggers every scored 6 an additional time.',
    retriggerSix: true,
    evaluate() { return []; }
  },
  {
    id: 'AD', rank: 'A', suit: 'diamonds', name: 'Ace of Diamonds', rarity: 'rare', basePrice: 6,
    tag: 'FINAL',
    desc: 'x2.5 Mult when played on your final Hand of the stage.',
    evaluate(inst, ctx) {
      if (ctx.handsLeftAfterPlay === 0) {
        return [{ multMul: 2.5, label: 'x2.5 Mult', color: COLORS.multLight, sfx: 'xmult' }];
      }
      return [];
    }
  },
  {
    id: '2H', rank: '2', suit: 'hearts', name: '2 of Hearts', rarity: 'uncommon', basePrice: 5,
    tag: 'MULT',
    desc: '+35 Mult when no modified pip was played.',
    evaluate(inst, ctx) {
      if (ctx.playedDice.length > 0 && ctx.playedDice.every(d => !d.mod && (d.rawValue ?? d.value) <= 6)) {
        return [{ multAdd: 35, label: '+35 Mult', color: COLORS.multLight, sfx: 'mult' }];
      }
      return [];
    }
  },
  {
    id: 'KH', rank: 'K', suit: 'hearts', name: 'King of Hearts', rarity: 'rare', basePrice: 6,
    tag: 'MULT',
    desc: 'x1.5 Mult for each 6 left on the table (unplayed).',
    evaluate(inst, ctx) {
      const events = [];
      for (const d of (ctx.unplayedDice || [])) {
        if (d.value === 6) {
          events.push({ multMul: 1.5, label: 'x1.5 Mult', color: COLORS.multLight, sfx: 'xmult', dieId: d.id });
        }
      }
      return events;
    }
  },
  {
    id: '2D', rank: '2', suit: 'diamonds', name: '2 of Diamonds', rarity: 'uncommon', basePrice: 5,
    tag: 'MULT',
    desc: 'Gains +0.5x Mult permanently whenever a Topaz Stone pip is scored.',
    isScaling: true,
    isScalingXMult: true,
    evaluate(inst, ctx) {
      const events = [];
      let goldCount = 0;
      for (const d of ctx.scoredDice) {
        if (d.mod === 'gold') {
          goldCount++;
          events.push({ scaleAdd: 0.5, label: 'Upgrade +0.5x!', color: COLORS.goldLight, sfx: 'money', dieId: d.id });
        }
      }
      const totalX = Math.round((1 + (inst.scalingBonus || 0) + goldCount * 0.5) * 100) / 100;
      if (totalX > 1) {
        events.push({ multMul: totalX, label: 'x' + totalX + ' Mult', color: COLORS.multLight, sfx: 'xmult' });
      }
      return events;
    }
  },
  {
    id: '3D', rank: '3', suit: 'diamonds', name: '3 of Diamonds', rarity: 'common', basePrice: 4,
    tag: 'ECON',
    desc: 'Earn +$1 for each Reroll left at the end of a chapter.',
    cashOutRerolls: 1,
    evaluate() { return []; }
  },
  {
    id: '8D', rank: '8', suit: 'diamonds', name: '8 of Diamonds', rarity: 'uncommon', basePrice: 5,
    tag: 'ECON',
    desc: 'Earn +$2 for each unused Hand left at the end of a chapter.',
    cashOutHands: 2,
    evaluate() { return []; }
  },
  {
    id: '2S', rank: '2', suit: 'spades', name: '2 of Spades', rarity: 'rare', basePrice: 6,
    tag: 'MULT',
    desc: 'Gains +1x Mult permanently whenever an Emerald Stone shatters.',
    isScaling: true,
    isScalingXMult: true,
    evaluate(inst, ctx) {
      const events = [];
      const shatters = ctx.shatteredCount || 0;
      for (let i = 0; i < shatters; i++) {
        events.push({ scaleAdd: 1, label: 'Upgrade +1x!', color: COLORS.goldLight, sfx: 'money' });
      }
      const totalX = Math.round((1 + (inst.scalingBonus || 0) + shatters) * 100) / 100;
      if (totalX > 1) {
        events.push({ multMul: totalX, label: 'x' + totalX + ' Mult', color: COLORS.multLight, sfx: 'xmult' });
      }
      return events;
    }
  },
  {
    id: '3S', rank: '3', suit: 'spades', name: '3 of Spades', rarity: 'uncommon', basePrice: 5,
    tag: 'ECON',
    desc: 'Earn +$5 whenever an Emerald Stone shatters.',
    evaluate(inst, ctx) {
      const events = [];
      const shatters = ctx.shatteredCount || 0;
      for (let i = 0; i < shatters; i++) {
        events.push({ moneyAdd: 5, label: '+$5', color: COLORS.goldLight, sfx: 'money' });
      }
      return events;
    }
  },
  {
    id: 'QC', rank: 'Q', suit: 'clubs', name: 'Queen of Clubs', rarity: 'rare', basePrice: 6,
    tag: 'COPY',
    desc: 'Copies the effect of the card directly to its right.',
    copyRight: true,
    evaluate() { return []; }
  },
  {
    id: '7C', rank: '7', suit: 'clubs', name: '7 of Clubs', rarity: 'uncommon', basePrice: 5,
    tag: 'TRIGGER',
    desc: 'Retriggers every scored odd die an additional time.',
    retriggerOdd: true,
    evaluate() { return []; }
  },
  {
    id: '10C', rank: '10', suit: 'clubs', name: '10 of Clubs', rarity: 'uncommon', basePrice: 5,
    tag: 'TRIGGER',
    desc: 'Retriggers every scored even die an additional time.',
    retriggerEven: true,
    evaluate() { return []; }
  }
];

export const CARD_BY_ID = Object.fromEntries(CARD_CATALOG.map(c => [c.id, c]));

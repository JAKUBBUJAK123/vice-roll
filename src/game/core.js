import { EDITIONS } from '../config/editions.js';
import { HANDS } from '../config/hands.js';
import { CARD_BY_ID } from '../config/cards.js';
import { MAX_POTION_SLOTS } from '../config/potions.js';
import { MAX_SELECT_DICE, TITLE_DICE } from '../config/dices.js';
import { DIFFICULTY_BY_ID } from '../config/cloths.js';
import {
  addShake as engineAddShake,
  spawnPopup as engineSpawnPopup,
  spawnParticles as engineSpawnParticles
} from '../engines/graphicEngine.js';

// ---------- 1. Stałe i dane ----------
export const LOGICAL_W = 1280;
export const LOGICAL_H = 760;
export const BASE_MAX_SLOTS = 5;
export const BASE_MAX_ARTEFACT_SLOTS = 3;
export const BASE_HANDS = 4;
export const BASE_REROLLS = 3;
export const SHOP_REROLL_COST = 3;
export const MAX_INTEREST = 5;
export const STORAGE_KEY = 'velvet_roll_stats_v1';

export const STAGE_TARGETS = [
  300, 800, 2000,
  5500, 14000, 32000,
  75000, 175000, 420000
];

export const BOSS_MODIFIERS = [
  { id: 'EVEN_ZERO', name: 'The Even Drain', short: 'Even dice give 0 Chips',
    desc: 'All even dice (2, 4, 6, 8...) contribute 0 pip Chips when scored.' },
  { id: 'TWO_REROLLS', name: 'The Tight Grip', short: '-1 Reroll this chapter',
    desc: 'Start this chapter with 1 fewer Reroll than usual.' },
  { id: 'ODD_ZERO', name: 'The Odd Tax', short: 'Odd dice give 0 Chips',
    desc: 'All odd dice (1, 3, 5, 7...) contribute 0 pip Chips when scored.' },
  { id: 'DISABLE_FIRST', name: 'The Blind Eye', short: 'First card slot disabled',
    desc: 'Your leftmost modifier card is debuffed. Reorder cards to adapt!' },
  { id: 'THREE_HANDS', name: 'The Short Stack', short: '-1 Hand this chapter',
    desc: 'Start this chapter with 1 fewer Hand than usual.' },
  { id: 'MIN_TWO_DICE', name: 'The Heavy Felt', short: 'Must play at least 2 dice',
    desc: 'Single-die hands are blocked; select at least 2 dice to score.' }
];

let nextUid = 1;

export function loadStats() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      return {
        bestHand: Number(parsed.bestHand) || 0,
        bestStage: Number(parsed.bestStage) || 0,
        wins: Number(parsed.wins) || 0
      };
    }
  } catch (_) {}
  return { bestHand: 0, bestStage: 0, wins: 0 };
}

export function saveStats(stats) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(stats));
  } catch (_) {}
}

export function getStageTarget(stage) {
  let target;
  if (stage <= STAGE_TARGETS.length) {
    target = STAGE_TARGETS[stage - 1];
  } else {
    target = STAGE_TARGETS[STAGE_TARGETS.length - 1];
    for (let s = STAGE_TARGETS.length + 1; s <= stage; s++) {
      target = Math.round((target * 2.35) / 100) * 100;
    }
  }
  if (state && state.selectedClothId === 'PALLADINS_CLOTH') {
    target = Math.round((target * 1.35) / 10) * 10;
  }
  const diff = state && DIFFICULTY_BY_ID[state.selectedDifficultyId];
  if (diff && diff.targetMult > 1) {
    target = Math.round((target * diff.targetMult) / 10) * 10;
  }
  return target;
}

export function getStageLabel(stage) {
  if (stage % 3 === 0) return 'THE CROUPIER';
  if (stage % 3 === 2) return 'HIGH TABLE';
  return 'VELVET TABLE';
}

export function getStageBaseReward(stage) {
  if (stage % 3 === 0) return 6;
  if (stage % 3 === 2) return 4;
  return 3;
}

function hasConsecutiveRun(values, runLen) {
  const uniq = [...new Set(values)].sort((a, b) => a - b);
  if (uniq.length < runLen) return false;
  let streak = 1;
  for (let i = 1; i < uniq.length; i++) {
    if (uniq[i] === uniq[i - 1] + 1) {
      streak++;
      if (streak >= runLen) return true;
    } else {
      streak = 1;
    }
  }
  return false;
}

export function evaluateConcreteValues(diceValues) {
  if (!diceValues || diceValues.length === 0) return null;
  const sorted = [...diceValues].sort((a, b) => a - b);
  const counts = {};
  for (const v of sorted) counts[v] = (counts[v] || 0) + 1;
  const freqs = Object.values(counts).sort((a, b) => b - a);
  const countSixOrHigher = sorted.filter(v => v >= 6).length;

  if (freqs[0] >= 4) return HANDS.QUARTET;
  if (countSixOrHigher >= 3 && freqs[0] >= 3 && sorted.filter(v => v === sorted[sorted.length - 1]).length >= 3 && sorted[sorted.length - 1] >= 6) {
    return HANDS.PERFECT_18;
  }
  if (sorted.length >= 4 && hasConsecutiveRun(sorted, 4)) return HANDS.GRAND_ASCEND;
  if (freqs[0] >= 3) return HANDS.TRIO;
  if (freqs[0] >= 2 && (freqs[1] || 0) >= 2) return HANDS.CROSSED_DOUBLETS;
  if (sorted.length >= 3 && hasConsecutiveRun(sorted, 3)) return HANDS.ASCEND;
  if (freqs[0] >= 2) return HANDS.DOUBLET;
  return HANDS.LONE_PIP;
}

export function resolveDiceAndEvaluateHand(selectedDice) {
  if (!selectedDice || selectedDice.length === 0) return null;

  const wildIndices = [];
  const baseValues = selectedDice.map((d, idx) => {
    if (d.mod === 'wild') wildIndices.push(idx);
    return d.value;
  });

  if (wildIndices.length === 0) {
    for (const d of selectedDice) d.effectiveValue = d.value;
    return { hand: evaluateConcreteValues(baseValues), resolvedValues: baseValues };
  }

  const maxTableVal = Math.max(6, ...baseValues);
  const candidates = [];
  for (let v = 1; v <= maxTableVal; v++) candidates.push(v);

  let bestHand = null;
  let bestScoreMetric = -1;
  let bestResolved = [...baseValues];

  function search(wIdx, currentVals) {
    if (wIdx >= wildIndices.length) {
      const h = evaluateConcreteValues(currentVals);
      const pipSum = currentVals.reduce((a, b) => a + b, 0);
      const metric = (h.chips * h.mult) * 1000 + pipSum;
      if (metric > bestScoreMetric) {
        bestScoreMetric = metric;
        bestHand = h;
        bestResolved = [...currentVals];
      }
      return;
    }
    const targetPos = wildIndices[wIdx];
    for (const cand of candidates) {
      currentVals[targetPos] = cand;
      search(wIdx + 1, currentVals);
    }
  }

  search(0, [...baseValues]);
  selectedDice.forEach((d, idx) => { d.effectiveValue = bestResolved[idx]; });
  return { hand: bestHand, resolvedValues: bestResolved };
}

export function rollEdition() {
  const r = Math.random() * 100;
  if (r < 80) return 'standard';
  if (r < 88) return 'foil';
  if (r < 95) return 'holographic';
  if (r < 98) return 'polychrome';
  return 'negative';
}

export function getShopPriceIncrease() {
  const diff = typeof state !== 'undefined' && state ? DIFFICULTY_BY_ID[state.selectedDifficultyId] : null;
  return diff ? (diff.priceAdd || 0) : 0;
}

export function createCardInstance(cardId, forcedEdition = null) {
  const def = CARD_BY_ID[cardId];
  const edition = forcedEdition || rollEdition();
  const edDef = EDITIONS[edition];
  const rawPrice = def.basePrice + edDef.priceAdd;
  const baseShopPrice = Math.max(4, Math.min(8, rawPrice));
  const price = baseShopPrice + getShopPriceIncrease();
  const sellValue = Math.max(2, Math.floor(baseShopPrice / 2));
  return {
    uid: nextUid++,
    cardId: def.id,
    edition,
    price,
    sellValue,
    scalingBonus: 0,
    x: 0, y: 0,
    targetX: 0, targetY: 0,
    scale: 1,
    bounce: 0,
    tilt: 0,
    flash: 0,
    pulseColor: '#FFFFFF'
  };
}

// ---------- 3. Stan gry ----------
export const state = {
  mode: 'TITLE_MENU', // TITLE_MENU | CLOTH_SELECT | COLLECTION | PLAYING | SCORING | CASH_OUT | POTION_PICK | ARTEFACT_PICK | SHOP | VICTORY | GAME_OVER
  modal: null,        // null | 'PAUSE' | 'GUIDE' | 'WORKSHOP' | 'CLONE_POTION'
  selectedClothId: 'BLUE',
  selectedDifficultyId: 'OPEN_TABLE',
  collectionTab: 'CARDS',
  collectionPage: 0,
  hoveredCollectionItem: null,
  crtEnabled: true,
  time: 0,
  stats: loadStats(),

  vw: window.innerWidth,
  vh: window.innerHeight,
  dpr: Math.min(window.devicePixelRatio || 1, 2),
  scale: 1,
  ox: 0,
  oy: 0,

  stage: 1,
  endless: false,
  targetScore: 300,
  stageScore: 0,
  displayScore: 0,
  handsLeft: BASE_HANDS,
  rerollsLeft: BASE_REROLLS,
  money: 4,
  activeBoss: null,
  usedBossIds: [],
  bestHandScore: 0,
  totalMoneyEarned: 0,
  handsPlayedRun: 0,

  tickets: {},
  dicePool: [],
  currentTicketStake: 0,
  shopTicket: null,
  shopRerollsUsed: 0,
  shopDiceUpgrades: [],
  workshopTarget: null,
  workshopDieIdx: 0,

  chips: 0,
  mult: 0,
  liveHandName: '',
  scoringHandTotal: 0,
  scoringBanner: '',
  scoringQueue: [],
  scoringTimer: 0,
  scoringStepCount: 0,
  pendingAfterScore: null,

  dice: [],

  activeCards: [],
  shopCards: [],
  potions: [],
  potionChoices: [],
  focusedPotionIdx: null,
  hoveredPotion: null,
  potionScoreMult: 1,
  artefacts: [],
  artefactChoices: [],
  hoveredArtefact: null,
  clonePotionSlotIdx: null,
  cashOutData: null,
  cashOutReveal: 0,

  titleDice: [],
  titleCards: [],

  mouseX: -999,
  mouseY: -999,
  hoveredCard: null,
  hoveredCloth: null,
  hoveredTicket: null,
  hoveredDieIdx: -1,
  focusedActiveUid: null,
  drag: null,
  buttons: [],
  hoverButtonId: null,
  noticeText: '',
  noticeTimer: 0,

  particles: [],
  popups: [],
  shakeMag: 0,
  hitFlash: 0,
  scoreTickAccum: 0
};

export function getTicketStacks(id) {
  return (state.tickets && state.tickets[id]) || 0;
}
export function getMaxSelectDice() {
  return MAX_SELECT_DICE + (getTicketStacks('WIDE_GRIP') > 0 ? 1 : 0);
}
export function hasArtefact(id) {
  return Array.isArray(state.artefacts) && state.artefacts.includes(id);
}
export function getMaxPotionSlots() {
  return MAX_POTION_SLOTS + (hasArtefact('ALCHEMY_BELT') ? 1 : 0) + (state.selectedClothId === 'WITCH_CLOTH' ? 1 : 0);
}
export function getMaxArtefactSlots() {
  return BASE_MAX_ARTEFACT_SLOTS + getTicketStacks('RELIC_RACK') + (state.selectedClothId === 'MYTHIC_TEAL' ? 1 : 0);
}
export function getShopRerollCost() {
  const diff = DIFFICULTY_BY_ID[state.selectedDifficultyId];
  const tax = diff ? (diff.rerollCostAdd || 0) : 0;
  return Math.max(1, SHOP_REROLL_COST + tax + (state.shopRerollsUsed || 0) - getTicketStacks('MEMBER_CARD') * 2);
}
export function getStageMaxHands() {
  let base = BASE_HANDS + getTicketStacks('EXTRA_SLEEVE');
  if (state.selectedClothId === 'PALLADINS_CLOTH') base += 1;
  if (state.selectedClothId === 'MYTHIC_TEAL' || state.selectedClothId === 'WHITE_SILK') base -= 1;
  if (hasArtefact('GREED_CURSE')) base -= 1;
  const bossDebuff = state.selectedClothId !== 'PALLADINS_CLOTH' && state.activeBoss && state.activeBoss.id === 'THREE_HANDS';
  return bossDebuff ? Math.max(1, base - 1) : Math.max(1, base);
}
export function getStageMaxRerolls() {
  let base = BASE_REROLLS + getTicketStacks('LOADED_WRIST');
  if (state.selectedClothId === 'MYTHIC_TEAL' || state.selectedClothId === 'WITCH_CLOTH' || state.selectedClothId === 'WHITE_SILK') {
    base -= 1;
  }
  const diff = DIFFICULTY_BY_ID[state.selectedDifficultyId];
  if (diff && diff.rerollDelta) base += diff.rerollDelta;
  const bossDebuff = state.selectedClothId !== 'PALLADINS_CLOTH' && state.activeBoss && state.activeBoss.id === 'TWO_REROLLS';
  return bossDebuff ? Math.max(0, base - 1) : Math.max(0, base);
}
export function getBaseCardSlots() {
  const baseSlots = state.selectedClothId === 'CRIMSON_VELVET' ? 4 : BASE_MAX_SLOTS;
  return baseSlots + getTicketStacks('CARD_SHARK');
}
export function getMaxCardSlots() {
  let negs = 0;
  for (const c of state.activeCards) if (c.edition === 'negative') negs++;
  return getBaseCardSlots() + negs;
}
export function getUsedCardSlots() {
  let count = 0;
  for (const c of state.activeCards) if (c.edition !== 'negative') count++;
  return count;
}
export function getShopCardSlotCount() {
  return 3 + (getTicketStacks('VIP_PASS') > 0 ? 1 : 0);
}

export function showNotice(text, dur = 1.6) {
  state.noticeText = text;
  state.noticeTimer = dur;
}
export function addShake(amount) { engineAddShake(state, amount); }
export function spawnPopup(x, y, text, color = '#FFFFFF', size = 22) {
  engineSpawnPopup(state, x, y, text, color, size);
}
export function spawnParticles(x, y, count, palette, speedMin = 80, speedMax = 300) {
  engineSpawnParticles(state, x, y, count, palette, speedMin, speedMax);
}

export function initTitleBackdrop() {
  state.titleDice = TITLE_DICE.map(d => ({ ...d }));
  state.titleCards = [
    createCardInstance('KS', 'foil'),
    createCardInstance('AH', 'holographic'),
    createCardInstance('KD', 'polychrome'),
    createCardInstance('QH', 'negative'),
    createCardInstance('7D', 'standard')
  ];
}
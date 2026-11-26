import { COLORS } from './colors.js';

export const DICE_COUNT = 5;
export const MAX_DICE_COUNT = 7;
export const DICE_SIDES = 6;
export const MAX_SELECT_DICE = 3;
export const WORKSHOP_UPGRADE_COST = 4;

export const DICE_LAYOUT = {
  startX: 336,
  spacing: 152,
  baseY: 368,
  size: 104,
  titleSize: 88
};

export const TITLE_DICE = [
  { value: 6, x: 185, y: 215, phase: 0.0, rot: -0.18 },
  { value: 5, x: 1105, y: 210, phase: 1.3, rot: 0.22 },
  { value: 3, x: 225, y: 575, phase: 2.4, rot: 0.14 },
  { value: 6, x: 1060, y: 560, phase: 3.7, rot: -0.20 }
];

export const FACE_MOD_META = {
  mult: {
    id: 'mult',
    name: 'Ruby Stone',
    short: 'RUBY',
    badge: '+15M',
    color: '#FB7185',
    border: '#E11D48',
    bg: '#4C0519',
    desc: '+15 Mult when this face is scored'
  },
  sapphire: {
    id: 'sapphire',
    name: 'Sapphire Stone',
    short: 'SAPPHIRE',
    badge: '+50P',
    color: '#38BDF8',
    border: '#0284C7',
    bg: '#082F49',
    desc: '+50 Base Points when this face is scored'
  },
  gold: {
    id: 'gold',
    name: 'Topaz Stone',
    short: 'TOPAZ',
    badge: '+$3',
    color: '#FEF08A',
    border: '#EAB308',
    bg: '#422006',
    desc: '+$3 immediately when this face is scored'
  },
  emerald: {
    id: 'emerald',
    name: 'Emerald Stone',
    short: 'Emerald',
    badge: 'x2M',
    color: '#A5F3FC',
    border: '#06B6D4',
    bg: '#083344',
    desc: 'x2 Mult when scored (25% chance to shatter)'
  },
  wild: {
    id: 'wild',
    name: 'Amethyst Stone',
    short: 'Amethyst',
    badge: '★WILD',
    color: '#E879F9',
    border: '#C026D3',
    bg: '#4A044E',
    desc: 'Counts as any value that maximizes your hand'
  }
};

export const DICE_UPGRADE_CATALOG = [
  {
    id: 'PIP_FORGER',
    name: 'Amber Stone',
    tag: '+1 VALUE',
    price: WORKSHOP_UPGRADE_COST,
    type: 'value_add',
    valueAdd: 1,
    color: '#F5CD79',
    desc: 'Permanently increases a chosen die face value by +1 (can exceed 6!).'
  },
  {
    id: 'RUBY_INLAY',
    name: 'Ruby Stone',
    tag: '+15 MULT',
    price: WORKSHOP_UPGRADE_COST,
    type: 'mod',
    mod: 'mult',
    color: '#FB7185',
    desc: 'Inlays a die face with Ruby: triggers +15 Mult when scored.'
  },
  {
    id: 'SAPPHIRE_INLAY',
    name: 'Sapphire Stone',
    tag: '+50 BASE',
    price: WORKSHOP_UPGRADE_COST,
    type: 'mod',
    mod: 'sapphire',
    color: '#38BDF8',
    desc: 'Inlays a die face with Sapphire: triggers +50 Base Points when scored.'
  },
  {
    id: 'GOLD_LEAF',
    name: 'Topaz Stone',
    tag: '+$3 GOLD',
    price: WORKSHOP_UPGRADE_COST,
    type: 'mod',
    mod: 'gold',
    color: '#FEF08A',
    desc: 'Gilds a die face with Topaz: grants +$3 whenever scored.'
  },
  {
    id: 'EMERALD_INLAY',
    name: 'Emerald Stone',
    tag: 'x2 MULT',
    price: WORKSHOP_UPGRADE_COST,
    type: 'mod',
    mod: 'emerald',
    color: '#A5F3FC',
    desc: 'Crystallizes a die face: x2 Mult when scored (25% chance to shatter).'
  },
  {
    id: 'WILD_FACE',
    name: 'Amethyst Stone',
    tag: '★ ANY VAL',
    price: WORKSHOP_UPGRADE_COST,
    type: 'mod',
    mod: 'wild',
    color: '#E879F9',
    desc: 'Enchants a die face as Wild: counts as whichever value maximizes your hand.'
  },
  {
    id: 'PINK_GEM',
    name: 'Pink Gem',
    tag: '-1 VALUE',
    price: WORKSHOP_UPGRADE_COST,
    type: 'value_add',
    valueAdd: -1,
    minValue: 1,
    color: '#F472B6',
    desc: 'Permanently decreases a chosen die face value by'
  }
];

export function createDefaultDieFaces() {
  const faces = [];
  for (let s = 1; s <= DICE_SIDES; s++) {
    faces.push({ value: s, mod: null });
  }
  return faces;
}

export function createPoolDie(id) {
  return {
    id,
    faces: createDefaultDieFaces()
  };
}

export function getDynamicDiceLayout(count) {
  const centerX = 640;
  const baseY = DICE_LAYOUT.baseY;
  let spacing = 152;
  let size = 104;
  if (count === 6) {
    spacing = 132;
    size = 98;
  } else if (count === 7) {
    spacing = 114;
    size = 92;
  } else if (count >= 8) {
    spacing = Math.floor(780 / (count - 1));
    size = Math.max(70, Math.min(90, Math.floor(spacing * 0.82)));
  }
  const totalSpan = (count - 1) * spacing;
  const startX = centerX - totalSpan / 2;
  return { startX, spacing, baseY, size };
}

export function createFreshDice(dicePool = null) {
  const pool = dicePool && dicePool.length > 0
    ? dicePool
    : Array.from({ length: DICE_COUNT }, (_, i) => createPoolDie(i));

  const count = pool.length;
  const { startX, spacing, baseY, size } = getDynamicDiceLayout(count);
  const arr = [];

  for (let i = 0; i < count; i++) {
    const poolDie = pool[i];
    const faceIndex = Math.floor(Math.random() * DICE_SIDES);
    const face = poolDie.faces[faceIndex];
    arr.push({
      id: i,
      faces: poolDie.faces,
      faceIndex,
      value: face.value,
      mod: face.mod,
      effectiveValue: face.value,
      renderSize: size,
      selected: false,
      x: startX + i * spacing,
      y: baseY - 120 - Math.random() * 60,
      targetX: startX + i * spacing,
      targetY: baseY,
      vy: 0,
      angle: (Math.random() - 0.5) * 1.4,
      vAngle: (Math.random() - 0.5) * 16,
      tumbleTimer: 0.42 + i * 0.055,
      flickerTimer: 0,
      scale: 1,
      hop: 0,
      flash: 0,
      flashColor: COLORS.baseLight
    });
  }
  return arr;
}

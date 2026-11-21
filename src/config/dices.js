import { COLORS } from './colors.js';

export const DICE_COUNT = 5;
export const DICE_SIDES = 6;
export const MAX_SELECT_DICE = 3;

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

export function getDicePipCoords(pOff) {
  return {
    1: [[0, 0]],
    2: [[-pOff, -pOff], [pOff, pOff]],
    3: [[-pOff, -pOff], [0, 0], [pOff, pOff]],
    4: [[-pOff, -pOff], [pOff, -pOff], [-pOff, pOff], [pOff, pOff]],
    5: [[-pOff, -pOff], [pOff, -pOff], [0, 0], [-pOff, pOff], [pOff, pOff]],
    6: [[-pOff, -pOff], [pOff, -pOff], [-pOff, 0], [pOff, 0], [-pOff, pOff], [pOff, pOff]]
  };
}

export function createFreshDice() {
  const { startX, spacing, baseY } = DICE_LAYOUT;
  const arr = [];
  for (let i = 0; i < DICE_COUNT; i++) {
    arr.push({
      id: i,
      value: 1 + Math.floor(Math.random() * DICE_SIDES),
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
      flashColor: COLORS.chipsLight
    });
  }
  return arr;
}

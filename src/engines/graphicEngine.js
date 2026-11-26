import { COLORS } from '../config/colors.js';
import { EDITIONS } from '../config/editions.js';
import { CARD_BY_ID } from '../config/cards.js';
import { DICE_SIDES, DICE_LAYOUT, FACE_MOD_META } from '../config/dices.js';

export function clamp(v, lo, hi) {
  return Math.max(lo, Math.min(hi, v));
}

export function lerp(a, b, t) {
  return a + (b - a) * t;
}

let diceSpriteImg = null;
let diceSpriteReady = false;
if (typeof Image !== 'undefined') {
  diceSpriteImg = new Image();
  diceSpriteImg.onload = () => { diceSpriteReady = true; };
  diceSpriteImg.src = new URL('../assets/dice/dice_spritesheet.png', import.meta.url).href;
}

function drawDiceSpriteFrame(ctx, faceVal, half, size) {
  const frameIdx = clamp(Math.round(faceVal) - 1, 0, 5);
  const frameSize = 32;
  ctx.save();
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(
    diceSpriteImg,
    frameIdx * frameSize, 0, frameSize, frameSize,
    -half, -half, size, size
  );
  ctx.restore();
}
const CARD_SPRITE_W = 64;
const CARD_SPRITE_H = 88;
const CARD_RANK_ORDER = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];
const CARD_SUIT_ROW = { hearts: 0, diamonds: 1, clubs: 2, spades: 3 };

let cardsSpriteImg = null;
let cardsSpriteReady = false;
if (typeof Image !== 'undefined') {
  cardsSpriteImg = new Image();
  cardsSpriteImg.onload = () => { cardsSpriteReady = true; };
  cardsSpriteImg.src = new URL('../assets/cards/cards_spritesheet.png', import.meta.url).href;
}

function drawCardSpriteFrame(ctx, rank, suit, hw, hh, w, h) {
  const col = CARD_RANK_ORDER.indexOf(rank);
  const row = CARD_SUIT_ROW[suit];
  const sx = col >= 0 && row >= 0 ? col * CARD_SPRITE_W : 0;
  const sy = col >= 0 && row >= 0 ? row * CARD_SPRITE_H : 4 * CARD_SPRITE_H; // BACK fallback
  ctx.save();
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(
    cardsSpriteImg,
    sx, sy, CARD_SPRITE_W, CARD_SPRITE_H,
    -hw, -hh, w, h
  );
  ctx.restore();
}

const GEM_SPRITE_INDEX = {
  RUBY_INLAY: 0,
  SAPPHIRE_INLAY: 1,
  EMERALD_INLAY: 2,
  PIP_FORGER: 3,
  GOLD_LEAF: 4,
  WILD_FACE: 5,
  PINK_GEM: 6
};

let gemsSpriteImg = null;
let gemsSpriteReady = false;
if (typeof Image !== 'undefined') {
  gemsSpriteImg = new Image();
  gemsSpriteImg.onload = () => { gemsSpriteReady = true; };
  gemsSpriteImg.src = new URL('../assets/gems/gems_spritesheet.png', import.meta.url).href;
}
const POTION_SPRITE_INDEX = {
  STRENGTH: 0,
  CLEANSE: 1,
  SHINE: 2,
  ECHO: 3,
  Gilded_Tonic: 4,
  WIND: 5,
  INFERNO: 6,
  GHOST: 7,
  PANORAMIX: 8,
  PSYHO: 9
};

let potionsSpriteImg = null;
let potionsSpriteReady = false;
if (typeof Image !== 'undefined') {
  potionsSpriteImg = new Image();
  potionsSpriteImg.onload = () => { potionsSpriteReady = true; };
  potionsSpriteImg.src = new URL('../assets/potions/potions_spritesheet.png', import.meta.url).href;
}

// Artefacts spritesheet (128x128 -> 4x4 grid of 32x32 sprites; indices 0..10)
const ARTEFACT_SPRITE_INDEX = {
  RED_CROWN: 0,
  GREED_CURSE: 1,
  SLIMEBALL: 2,
  ALCHEMY_BELT: 3,
  BONE: 7,
  PUCH: 9,
  SWORD: 4,
  CRACKED_CUP: 6,
  PENNY: 8,
  WEIGHTED_DIE: 5,
  DIAMOND: 10
};

let artefactsSpriteImg = null;
let artefactsSpriteReady = false;
if (typeof Image !== 'undefined') {
  artefactsSpriteImg = new Image();
  artefactsSpriteImg.onload = () => { artefactsSpriteReady = true; };
  artefactsSpriteImg.src = new URL('../assets/artefacts/artefacts.png', import.meta.url).href;
}
let ticketsSpriteImg = null;
let ticketsSpriteReady = false;
if (typeof Image !== 'undefined') {
  ticketsSpriteImg = new Image();
  ticketsSpriteImg.onload = () => { ticketsSpriteReady = true; };
  ticketsSpriteImg.src = new URL('../assets/tickets/tickets_spritesheet.png', import.meta.url).href;
}

let clothsSpriteImg = null;
let clothsSpriteReady = false;
if (typeof Image !== 'undefined') {
  clothsSpriteImg = new Image();
  clothsSpriteImg.onload = () => { clothsSpriteReady = true; };
  clothsSpriteImg.src = new URL('../assets/clothes/cloths_spritesheet.png', import.meta.url).href;
}

let diffSpriteImg = null;
let diffSpriteReady = false;
if (typeof Image !== 'undefined') {
  diffSpriteImg = new Image();
  diffSpriteImg.onload = () => { diffSpriteReady = true; };
  diffSpriteImg.src = new URL('../assets/clothes/difficulty_spritesheet.png', import.meta.url).href;
}

// Offscreen subtle felt grain pattern
let feltPatternCanvas = null;

function getFeltPatternCanvas() {
  if (!feltPatternCanvas && typeof document !== 'undefined') {
    feltPatternCanvas = document.createElement('canvas');
    feltPatternCanvas.width = 64;
    feltPatternCanvas.height = 64;
    const pctx = feltPatternCanvas.getContext('2d');
    pctx.clearRect(0, 0, 64, 64);
    for (let y = 0; y < 64; y += 2) {
      for (let x = 0; x < 64; x += 2) {
        const v = ((x * 13 + y * 29) % 17) / 17;
        pctx.fillStyle = v > 0.5 ? 'rgba(255,255,255,0.018)' : 'rgba(0,0,0,0.035)';
        pctx.fillRect(x, y, 2, 2);
      }
    }
  }
  return feltPatternCanvas;
}

// =========================================================================
// PARTICLE EFFECTS, FLOATING POPUPS & CAMERA SHAKE / JUICE
// =========================================================================
export function addShake(state, amount) {
  state.shakeMag = Math.min(22, Math.max(state.shakeMag, amount));
}

export function spawnPopup(state, x, y, text, color = '#FFFFFF', size = 22) {
  state.popups.push({
    x,
    y,
    vy: -56,
    text,
    color,
    size,
    life: 0,
    maxLife: 1.05,
    scale: 0.45
  });
}

export function spawnParticles(state, x, y, count, palette, speedMin = 80, speedMax = 300) {
  for (let i = 0; i < count; i++) {
    if (state.particles.length > 260) state.particles.shift();
    const ang = Math.random() * Math.PI * 2;
    const spd = speedMin + Math.random() * (speedMax - speedMin);
    state.particles.push({
      x,
      y,
      vx: Math.cos(ang) * spd,
      vy: Math.sin(ang) * spd - 60,
      size: 3 + Math.random() * 6,
      color: palette[Math.floor(Math.random() * palette.length)],
      life: 0,
      maxLife: 0.45 + Math.random() * 0.55,
      rot: Math.random() * Math.PI * 2,
      vrot: (Math.random() - 0.5) * 10
    });
  }
}

export function updateGraphicsEffects(state, dt) {
  if (state.shakeMag > 0.1) state.shakeMag *= Math.pow(0.0015, dt);
  else state.shakeMag = 0;

  if (state.hitFlash > 0.01) state.hitFlash = Math.max(0, state.hitFlash - dt * 1.8);

  // Particles
  for (let i = state.particles.length - 1; i >= 0; i--) {
    const p = state.particles[i];
    p.life += dt;
    if (p.life >= p.maxLife) {
      state.particles.splice(i, 1);
    } else {
      p.vy += 420 * dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.rot += p.vrot * dt;
    }
  }

  // Floating popups
  for (let i = state.popups.length - 1; i >= 0; i--) {
    const pop = state.popups[i];
    pop.life += dt;
    if (pop.life >= pop.maxLife) {
      state.popups.splice(i, 1);
    } else {
      pop.y += pop.vy * dt;
      pop.vy *= Math.pow(0.18, dt);
      pop.scale = lerp(pop.scale, 1, Math.min(1, dt * 18));
    }
  }
}

export function drawParticlesAndPopups(ctx, state) {
  for (const p of state.particles) {
    const a = 1 - p.life / p.maxLife;
    ctx.save();
    ctx.translate(p.x, p.y);
    ctx.rotate(p.rot);
    ctx.globalAlpha = clamp(a, 0, 1);
    ctx.fillStyle = p.color;
    ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size);
    ctx.restore();
  }

  for (const pop of state.popups) {
    const t = pop.life / pop.maxLife;
    const alpha = t < 0.72 ? 1 : 1 - (t - 0.72) / 0.28;
    ctx.save();
    ctx.translate(pop.x, pop.y);
    ctx.scale(pop.scale, pop.scale);
    ctx.globalAlpha = clamp(alpha, 0, 1);
    ctx.font = `900 ${pop.size}px ui-monospace, SFMono-Regular, Menlo, monospace`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.lineWidth = 5;
    ctx.strokeStyle = 'rgba(5, 11, 14, 0.92)';
    ctx.strokeText(pop.text, 0, 0);
    ctx.fillStyle = pop.color;
    ctx.fillText(pop.text, 0, 0);
    ctx.restore();
  }
}

export function drawCRTOverlay(ctx, state) {
  if (!state.crtEnabled) return;
  ctx.save();
  // Crisp subtle horizontal scanlines
  ctx.fillStyle = 'rgba(0, 0, 0, 0.14)';
  for (let y = 0; y < state.vh; y += 3) {
    ctx.fillRect(0, y, state.vw, 1);
  }
  // Subtle corner CRT vignette & phosphor bloom
  const cx = state.vw / 2, cy = state.vh / 2;
  const rad = ctx.createRadialGradient(cx, cy, Math.min(state.vw, state.vh) * 0.36, cx, cy, Math.hypot(cx, cy));
  rad.addColorStop(0, 'rgba(60, 255, 180, 0.025)');
  rad.addColorStop(0.75, 'rgba(0, 0, 0, 0.04)');
  rad.addColorStop(1, 'rgba(0, 0, 0, 0.42)');
  ctx.fillStyle = rad;
  ctx.fillRect(0, 0, state.vw, state.vh);
  ctx.restore();
}

export function drawHitFlash(ctx, state, logicalW, logicalH) {
  if (state.hitFlash > 0.01) {
    ctx.fillStyle = `rgba(253, 224, 71, ${state.hitFlash * 0.22})`;
    ctx.fillRect(0, 0, logicalW, logicalH);
  }
}

// =========================================================================
// CANVAS DRAWING PRIMITIVES & PROCEDURAL IMAGE OPERATIONS
// =========================================================================

// Crisp pixel-bevel rounded rectangle path (stepped retro-modern corners)
export function tracePixelRect(ctx, x, y, w, h, r = 6) {
  const c = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + c, y);
  ctx.lineTo(x + w - c, y);
  ctx.lineTo(x + w, y + c);
  ctx.lineTo(x + w, y + h - c);
  ctx.lineTo(x + w - c, y + h);
  ctx.lineTo(x + c, y + h);
  ctx.lineTo(x, y + h - c);
  ctx.lineTo(x, y + c);
  ctx.closePath();
}

export function drawBevelPanel(ctx, x, y, w, h, opts = {}) {
  const {
    fill = COLORS.railPanel,
    border = COLORS.railBorder,
    topHighlight = 'rgba(255,255,255,0.08)',
    bottomShadow = 'rgba(0,0,0,0.45)',
    lip = 4,
    r = 8,
    glow = null
  } = opts;

  ctx.save();
  if (glow) {
    ctx.shadowColor = glow;
    ctx.shadowBlur = 16;
  }
  if (lip > 0) {
    tracePixelRect(ctx, x, y + lip, w, h, r);
    ctx.fillStyle = bottomShadow;
    ctx.fill();
  }
  ctx.shadowBlur = 0;

  tracePixelRect(ctx, x, y, w, h, r);
  ctx.fillStyle = fill;
  ctx.fill();

  // Inner top bevel line
  ctx.save();
  ctx.clip();
  ctx.fillStyle = topHighlight;
  ctx.fillRect(x, y, w, 3);
  ctx.fillStyle = 'rgba(0,0,0,0.18)';
  ctx.fillRect(x, y + h - 3, w, 3);
  ctx.restore();

  tracePixelRect(ctx, x + 0.5, y + 0.5, w - 1, h - 1, r);
  ctx.strokeStyle = border;
  ctx.lineWidth = 1.5;
  ctx.stroke();
  ctx.restore();
}

// Crisp procedural suit icons (zero OS emoji fallback)
export function drawSuitIcon(ctx, suit, cx, cy, size, color) {
  ctx.save();
  ctx.translate(cx, cy);
  ctx.fillStyle = color;
  const s = size;

  if (suit === 'diamonds') {
    ctx.beginPath();
    ctx.moveTo(0, -s);
    ctx.lineTo(s * 0.78, 0);
    ctx.lineTo(0, s);
    ctx.lineTo(-s * 0.78, 0);
    ctx.closePath();
    ctx.fill();
  } else if (suit === 'hearts') {
    ctx.beginPath();
    ctx.moveTo(0, s * 0.92);
    ctx.bezierCurveTo(-s * 1.15, s * 0.15, -s * 1.1, -s * 0.85, -s * 0.45, -s * 0.88);
    ctx.bezierCurveTo(-s * 0.15, -s * 0.88, 0, -s * 0.52, 0, -s * 0.35);
    ctx.bezierCurveTo(0, -s * 0.52, s * 0.15, -s * 0.88, s * 0.45, -s * 0.88);
    ctx.bezierCurveTo(s * 1.1, -s * 0.85, s * 1.15, s * 0.15, 0, s * 0.92);
    ctx.closePath();
    ctx.fill();
  } else if (suit === 'spades') {
    ctx.beginPath();
    ctx.moveTo(0, -s * 0.96);
    ctx.bezierCurveTo(s * 1.05, -s * 0.12, s * 1.05, s * 0.65, s * 0.4, s * 0.58);
    ctx.bezierCurveTo(s * 0.15, s * 0.55, s * 0.08, s * 0.35, s * 0.08, s * 0.35);
    ctx.lineTo(s * 0.3, s * 0.92);
    ctx.lineTo(-s * 0.3, s * 0.92);
    ctx.lineTo(-s * 0.08, s * 0.35);
    ctx.bezierCurveTo(-s * 0.08, s * 0.35, -s * 0.15, s * 0.55, -s * 0.4, s * 0.58);
    ctx.bezierCurveTo(-s * 1.05, s * 0.65, -s * 1.05, -s * 0.12, 0, -s * 0.96);
    ctx.closePath();
    ctx.fill();
    } else if (suit === 'clubs') {
      const r = s * 0.38;
      const circle = (x, y) => {
        ctx.beginPath();
        ctx.arc(x, y, r, 0, Math.PI * 2);
        ctx.fill();
      };
      circle(0, -s * 0.42);
      circle(-s * 0.44, s * 0.12);
      circle(s * 0.44, s * 0.12);
    
      ctx.beginPath();
      ctx.moveTo(0, -s * 0.1);
      ctx.lineTo(s * 0.28, s * 0.92);
      ctx.lineTo(-s * 0.28, s * 0.92);
      ctx.closePath();
      ctx.fill();
    }
  ctx.restore();
}

// Gemstone spritesheet icons for Dice Workshop stone cards
export function drawGemstoneIcon(ctx, upgradeId, cx, cy, size, time = 0) {
  ctx.save();
  ctx.translate(cx, cy);
  const s = size;
  const glint = 0.5 + 0.5 * Math.sin(time * 3.0 + cx * 0.05);

  const glowColors = {
    PIP_FORGER: 'rgba(245, 158, 11, 0.36)',
    RUBY_INLAY: 'rgba(225, 29, 72, 0.40)',
    SAPPHIRE_INLAY: 'rgba(56, 189, 248, 0.40)',
    GOLD_LEAF: 'rgba(250, 204, 21, 0.38)',
    EMERALD_INLAY: 'rgba(16, 185, 129, 0.40)',
    WILD_FACE: 'rgba(192, 132, 252, 0.42)',
    PINK_GEM: 'rgba(244, 114, 182, 0.42)'
  };

  // Soft ambient gem aura
  const aura = ctx.createRadialGradient(0, 0, 2, 0, 0, s * 1.4);
  aura.addColorStop(0, glowColors[upgradeId] || 'rgba(192, 132, 252, 0.35)');
  aura.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = aura;
  ctx.beginPath();
  ctx.arc(0, 0, s * 1.4, 0, Math.PI * 2);
  ctx.fill();

  const frameIdx = GEM_SPRITE_INDEX[upgradeId] ?? 5;
  if (gemsSpriteReady) {
    const drawSize = s * 2.15;
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(
      gemsSpriteImg,
      frameIdx * 32, 0, 32, 32,
      -drawSize / 2, -drawSize / 2, drawSize, drawSize
    );
  }

  // Animated sparkle glint
  const spX = -s * 0.42;
  const spY = -s * 0.46;
  const arm = s * (0.20 + glint * 0.16);
  ctx.fillStyle = `rgba(255, 255, 255, ${0.5 + glint * 0.45})`;
  ctx.beginPath();
  ctx.moveTo(spX, spY - arm);
  ctx.lineTo(spX + 1.4, spY - 1.4);
  ctx.lineTo(spX + arm, spY);
  ctx.lineTo(spX + 1.4, spY + 1.4);
  ctx.lineTo(spX, spY + arm);
  ctx.lineTo(spX - 1.4, spY + 1.4);
  ctx.lineTo(spX - arm, spY);
  ctx.lineTo(spX - 1.4, spY - 1.4);
  ctx.closePath();
  ctx.fill();

  ctx.restore();
}

export function drawPotionIcon(ctx, potionId, cx, cy, size = 18, time = 0) {
  const s = size;
  const frameIdx = POTION_SPRITE_INDEX[potionId] ?? 0;
  const phase = frameIdx * 0.9;
  const pulse = 0.5 + 0.5 * Math.sin(time * 3.8 + phase);
  const floatY = Math.sin(time * 2.6 + phase) * (s * 0.06);

  const themes = {
    STRENGTH:     { core: `rgba(251, 113, 133, ${0.58 + pulse * 0.25})`, mid: `rgba(225, 29, 72, ${0.28 + pulse * 0.14})`,   shadow: '#FB7185', spark: '#FFE4E6' },
    CLEANSE:      { core: `rgba(52, 211, 153, ${0.58 + pulse * 0.25})`,  mid: `rgba(16, 185, 129, ${0.28 + pulse * 0.14})`,  shadow: '#34D399', spark: '#D1FAE5' },
    SHINE:        { core: `rgba(125, 211, 252, ${0.58 + pulse * 0.25})`, mid: `rgba(2, 132, 199, ${0.28 + pulse * 0.14})`,   shadow: '#7DD3FC', spark: '#E0F2FE' },
    ECHO:         { core: `rgba(45, 212, 191, ${0.58 + pulse * 0.25})`,  mid: `rgba(13, 148, 136, ${0.28 + pulse * 0.14})`,  shadow: '#2DD4BF', spark: '#99F6E4' },
    Gilded_Tonic: { core: `rgba(250, 204, 21, ${0.58 + pulse * 0.25})`,  mid: `rgba(202, 138, 4, ${0.28 + pulse * 0.14})`,   shadow: '#FACC15', spark: '#FEF08A' },
    WIND:         { core: `rgba(110, 231, 183, ${0.58 + pulse * 0.25})`, mid: `rgba(16, 185, 129, ${0.28 + pulse * 0.14})`,  shadow: '#6EE7B7', spark: '#D1FAE5' },
    INFERNO:      { core: `rgba(251, 146, 60, ${0.58 + pulse * 0.25})`,  mid: `rgba(234, 88, 12, ${0.28 + pulse * 0.14})`,   shadow: '#FB923C', spark: '#FED7AA' },
    GHOST:        { core: `rgba(167, 139, 250, ${0.58 + pulse * 0.25})`, mid: `rgba(109, 40, 217, ${0.28 + pulse * 0.14})`,  shadow: '#A78BFA', spark: '#DDD6FE' },
    PANORAMIX:    { core: `rgba(245, 158, 11, ${0.58 + pulse * 0.25})`,  mid: `rgba(180, 83, 9, ${0.28 + pulse * 0.14})`,    shadow: '#F59E0B', spark: '#FDE68A' },
    PSYHO:        { core: `rgba(232, 121, 249, ${0.58 + pulse * 0.25})`, mid: `rgba(192, 38, 211, ${0.28 + pulse * 0.14})`,  shadow: '#E879F9', spark: '#F5D0FE' }
  };
  const t = themes[potionId] || themes.STRENGTH;

  ctx.save();
  ctx.translate(cx, cy + floatY);

  // Pulsating multi-stop radiant aura behind bottle
  const auraR = s * (1.35 + pulse * 0.22);
  const aura = ctx.createRadialGradient(0, s * 0.08, 1, 0, s * 0.08, auraR);
  aura.addColorStop(0, t.core);
  aura.addColorStop(0.5, t.mid);
  aura.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = aura;
  ctx.beginPath();
  ctx.arc(0, s * 0.08, auraR, 0, Math.PI * 2);
  ctx.fill();

  if (potionsSpriteReady) {
    const col = frameIdx % 5;
    const row = Math.floor(frameIdx / 5);
    const drawSize = s * 2.1;
    ctx.save();
    ctx.shadowColor = t.shadow;
    ctx.shadowBlur = 10 + pulse * 8;
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(
      potionsSpriteImg,
      col * 32, row * 32, 32, 32,
      -drawSize / 2, -drawSize / 2, drawSize, drawSize
    );
    ctx.restore();
  }

  // Orbiting / twinkling arcane motes
  const motes = [
    { ox: -0.62, oy: -0.35, speed: 4.2, offset: 0.4 },
    { ox: 0.65, oy: 0.18, speed: 3.6, offset: 2.1 },
    { ox: -0.18, oy: -0.78, speed: 4.8, offset: 3.9 }
  ];
  for (const m of motes) {
    const tw = Math.max(0, Math.sin(time * m.speed + phase + m.offset));
    if (tw > 0.2) {
      const mx = s * m.ox;
      const my = s * m.oy - tw * s * 0.12;
      const arm = s * (0.10 + tw * 0.12);
      ctx.fillStyle = t.spark;
      ctx.globalAlpha = tw * 0.85;
      ctx.beginPath();
      ctx.moveTo(mx, my - arm);
      ctx.lineTo(mx + arm * 0.28, my - arm * 0.28);
      ctx.lineTo(mx + arm, my);
      ctx.lineTo(mx + arm * 0.28, my + arm * 0.28);
      ctx.lineTo(mx, my + arm);
      ctx.lineTo(mx - arm * 0.28, my + arm * 0.28);
      ctx.lineTo(mx - arm, my);
      ctx.lineTo(mx - arm * 0.28, my - arm * 0.28);
      ctx.closePath();
      ctx.fill();
    }
  }
  ctx.globalAlpha = 1;

  ctx.restore();
}

export function drawArtefactIcon(ctx, artefactId, cx, cy, size = 18, time = 0) {
  const s = size;
  const frameIdx = ARTEFACT_SPRITE_INDEX[artefactId] ?? 0;
  const phase = frameIdx * 0.85;
  const pulse = 0.5 + 0.5 * Math.sin(time * 3.2 + phase);

  const themes = {
    RED_CROWN:    { core: `rgba(251, 113, 133, ${0.46 + pulse * 0.2})`, shadow: '#FB7185' },
    GREED_CURSE:  { core: `rgba(251, 191, 36, ${0.46 + pulse * 0.2})`,  shadow: '#FBBF24' },
    SLIMEBALL:    { core: `rgba(74, 222, 128, ${0.46 + pulse * 0.2})`,  shadow: '#4ADE80' },
    ALCHEMY_BELT: { core: `rgba(56, 189, 248, ${0.46 + pulse * 0.2})`,  shadow: '#38BDF8' },
    BONE:         { core: `rgba(226, 232, 240, ${0.46 + pulse * 0.2})`, shadow: '#E2E8F0' },
    PUCH:         { core: `rgba(245, 158, 11, ${0.46 + pulse * 0.2})`,  shadow: '#F59E0B' },
    SWORD:        { core: `rgba(248, 113, 113, ${0.46 + pulse * 0.2})`, shadow: '#F87171' },
    CRACKED_CUP:  { core: `rgba(96, 165, 250, ${0.46 + pulse * 0.2})`,  shadow: '#60A5FA' },
    PENNY:        { core: `rgba(250, 204, 21, ${0.46 + pulse * 0.2})`,  shadow: '#FACC15' },
    WEIGHTED_DIE: { core: `rgba(167, 139, 250, ${0.46 + pulse * 0.2})`, shadow: '#A78BFA' },
    DIAMOND:      { core: `rgba(45, 212, 191, ${0.46 + pulse * 0.2})`,  shadow: '#2DD4BF' }
  };
  const t = themes[artefactId] || themes.RED_CROWN;

  ctx.save();
  ctx.translate(cx, cy);

  const auraR = s * (1.28 + pulse * 0.16);
  const aura = ctx.createRadialGradient(0, 0, 2, 0, 0, auraR);
  aura.addColorStop(0, t.core);
  aura.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = aura;
  ctx.beginPath();
  ctx.arc(0, 0, auraR, 0, Math.PI * 2);
  ctx.fill();

  if (artefactsSpriteReady) {
    const drawSize = s * 2.1;
    const col = frameIdx % 4;
    const row = Math.floor(frameIdx / 4);
    ctx.save();
    ctx.shadowColor = t.shadow;
    ctx.shadowBlur = 8 + pulse * 6;
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(
      artefactsSpriteImg,
      col * 32, row * 32, 32, 32,
      -drawSize / 2, -drawSize / 2, drawSize, drawSize
    );
    ctx.restore();
  }

  ctx.restore();
}

export function traceTicketRect(ctx, x, y, w, h, r = 8, notchR = 8) {
  const midY = y + h * 0.42;
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, midY - notchR);
  ctx.arc(x + w, midY, notchR, -Math.PI / 2, Math.PI / 2, true);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, midY + notchR);
  ctx.arc(x, midY, notchR, Math.PI / 2, -Math.PI / 2, true);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

export function drawTicketIcon(ctx, ticket, cx, cy, size = 18, time = 0) {
  const s = size;
  const pulse = 0.5 + 0.5 * Math.sin(time * 3.0);
  ctx.save();
  ctx.translate(cx, cy);

  const aura = ctx.createRadialGradient(0, 0, 2, 0, 0, s * 1.25);
  aura.addColorStop(0, `${ticket.color}55`);
  aura.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = aura;
  ctx.beginPath();
  ctx.arc(0, 0, s * 1.25, 0, Math.PI * 2);
  ctx.fill();

  if (ticketsSpriteReady) {
    const idx = ticket.spriteIdx ?? 0;
    const col = idx % 5;
    const row = Math.floor(idx / 5);
    const drawSize = s * 2.1;
    ctx.save();
    ctx.shadowColor = ticket.color;
    ctx.shadowBlur = 6 + pulse * 5;
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(
      ticketsSpriteImg,
      col * 32, row * 32, 32, 32,
      -drawSize / 2, -drawSize / 2, drawSize, drawSize
    );
    ctx.restore();
  }

  ctx.restore();
}

export function drawClothSwatch(ctx, cloth, x, y, w, h, opts = {}) {
  const { selected = false, hovered = false } = opts;
  ctx.save();

  tracePixelRect(ctx, x, y, w, h, 8);
  ctx.save();
  ctx.clip();
  if (clothsSpriteReady) {
    const idx = cloth.spriteIdx ?? 0;
    const col = idx % 4;
    const row = Math.floor(idx / 4);
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(
      clothsSpriteImg,
      col * 32, row * 32, 32, 32,
      x, y, w, h
    );
  } else {
    ctx.fillStyle = '#1D3324';
    ctx.fillRect(x, y, w, h);
  }

  // Subtle woven sheen
  const sheen = ctx.createLinearGradient(x, y, x + w, y + h);
  sheen.addColorStop(0, 'rgba(255, 255, 255, 0.14)');
  sheen.addColorStop(0.5, 'rgba(255, 255, 255, 0)');
  sheen.addColorStop(1, 'rgba(0, 0, 0, 0.22)');
  ctx.fillStyle = sheen;
  ctx.fillRect(x, y, w, h);
  ctx.restore();

  tracePixelRect(ctx, x + 0.5, y + 0.5, w - 1, h - 1, 8);
  ctx.strokeStyle = selected
    ? COLORS.goldLight
    : hovered
      ? cloth.color
      : 'rgba(255, 255, 255, 0.22)';
  ctx.lineWidth = selected ? 2.5 : 1.5;
  ctx.stroke();

  ctx.restore();
}

export function drawDifficultyIcon(ctx, diff, cx, cy, size = 32) {
  ctx.save();
  ctx.translate(cx, cy);
  if (diffSpriteReady) {
    const idx = diff.spriteIdx ?? 0;
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(
      diffSpriteImg,
      idx * 32, 0, 32, 32,
      -size / 2, -size / 2, size, size
    );
  }
  ctx.restore();
}

export function wrapLines(ctx, text, maxW) {
  const words = text.split(' ');
  const lines = [];
  let cur = '';
  for (const w of words) {
    const test = cur ? cur + ' ' + w : w;
    if (ctx.measureText(test).width > maxW && cur) {
      lines.push(cur);
      cur = w;
    } else {
      cur = test;
    }
  }
  if (cur) lines.push(cur);
  return lines;
}

export function getSuitColor(suit, isDarkCard) {
  if (isDarkCard) {
    return {
      spades: COLORS.voidSpades,
      hearts: COLORS.voidHearts,
      diamonds: COLORS.voidDiamonds,
      clubs: COLORS.voidClubs
    }[suit];
  }
  return {
    spades: COLORS.suitSpades,
    hearts: COLORS.suitHearts,
    diamonds: COLORS.suitDiamonds,
    clubs: COLORS.suitClubs
  }[suit];
}

export function drawTableBackground(ctx, state) {
  // Full viewport midnight-velvet art-deco parlor table with radial vignette
  const cx = state.vw / 2;
  const cy = state.vh / 2;
  const maxR = Math.hypot(cx, cy) * 1.05;
  const rad = ctx.createRadialGradient(cx, cy * 0.88, 30, cx, cy, maxR);
  rad.addColorStop(0, COLORS.feltCenter);
  rad.addColorStop(0.55, COLORS.feltMid);
  rad.addColorStop(1, COLORS.feltEdge);
  ctx.fillStyle = rad;
  ctx.fillRect(0, 0, state.vw, state.vh);

  // Subtle woven velvet texture
  const patCanvas = getFeltPatternCanvas();
  if (patCanvas) {
    const pat = ctx.createPattern(patCanvas, 'repeat');
    if (pat) {
      ctx.fillStyle = pat;
      ctx.fillRect(0, 0, state.vw, state.vh);
    }
  }

  // Art-Deco geometric diamond & brass filigree table inlay
  ctx.save();
  ctx.strokeStyle = 'rgba(212, 163, 89, 0.08)';
  ctx.lineWidth = 1.5;
  const rx = state.vw * 0.42;
  const ry = state.vh * 0.36;
  ctx.beginPath();
  ctx.moveTo(cx, cy - ry);
  ctx.lineTo(cx + rx, cy);
  ctx.lineTo(cx, cy + ry);
  ctx.lineTo(cx - rx, cy);
  ctx.closePath();
  ctx.stroke();

  ctx.strokeStyle = 'rgba(212, 163, 89, 0.05)';
  ctx.strokeRect(cx - state.vw * 0.36, cy - state.vh * 0.30, state.vw * 0.72, state.vh * 0.60);
  ctx.restore();
}

export function drawDieFaceMini(ctx, face, cx, cy, size, opts = {}) {
  const { selected = false, hovered = false } = opts;
  const half = size / 2;
  const modMeta = face.mod ? FACE_MOD_META[face.mod] : null;
  const val = face.value;

  ctx.save();
  ctx.translate(cx, cy);

  if (diceSpriteReady && val >= 1 && val <= 6) {
    drawDiceSpriteFrame(ctx, val, half, size);
    if (modMeta) {
      tracePixelRect(ctx, -half + 1, -half + 1, size - 2, size - 2, 8);
      ctx.fillStyle = modMeta.color;
      ctx.globalAlpha = 0.28;
      ctx.fill();
      ctx.globalAlpha = 1;
    }
    if (selected || hovered || modMeta) {
      tracePixelRect(ctx, -half + 0.5, -half + 0.5, size - 1, size - 1, 8);
      ctx.strokeStyle = (selected || hovered) ? COLORS.brassBright : modMeta.border;
      ctx.lineWidth = (selected || hovered) ? 2.5 : 2;
      ctx.stroke();
    }
  } else {
    // Forged >6 or pre-load fallback face with numeric value
    tracePixelRect(ctx, -half, -half, size, size, 10);
    ctx.fillStyle = modMeta ? modMeta.bg : COLORS.ivory;
    ctx.fill();
    tracePixelRect(ctx, -half + 0.5, -half + 0.5, size - 1, size - 1, 10);
    ctx.strokeStyle = (selected || hovered) ? COLORS.brassBright : (modMeta ? modMeta.border : 'rgba(24, 34, 48, 0.65)');
    ctx.lineWidth = (selected || hovered) ? 2.5 : 1.5;
    ctx.stroke();

    ctx.fillStyle = modMeta ? modMeta.color : '#1A2433';
    ctx.font = `900 ${Math.round(size * 0.44)}px ui-monospace, SFMono-Regular, Menlo, monospace`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(String(val), 0, 1);
  }

  // Value > 6 corner numeral badge
  if (val > 6) {
    ctx.fillStyle = '#1E1136';
    ctx.fillRect(-half + 4, -half + 4, 18, 13);
    ctx.fillStyle = COLORS.goldLight;
    ctx.font = '900 9.5px ui-monospace, SFMono-Regular, Menlo, monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(String(val), -half + 13, -half + 10.5);
  }

  // Mod badge
  if (modMeta) {
    const bw = Math.min(size - 8, 38);
    ctx.fillStyle = modMeta.bg;
    ctx.fillRect(half - bw - 3, -half + 3, bw, 13);
    ctx.fillStyle = modMeta.color;
    ctx.font = '800 8.5px ui-monospace, SFMono-Regular, Menlo, monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(modMeta.badge, half - bw / 2 - 3, -half + 9.5);
  }

  ctx.restore();
}

export function drawDie(ctx, state, die, isTitle = false, debuffed = false) {
  const size = isTitle ? DICE_LAYOUT.titleSize : (die.renderSize || DICE_LAYOUT.size);
  const half = size / 2;
  const liftY = isTitle ? 0 : (die.selected ? -34 : 0) - die.hop * 22;
  const px = die.x;
  const py = die.y + liftY;
  const shadowOffset = isTitle ? 12 : (die.selected ? 28 : 10) + die.hop * 14;
  const isTumbling = die.tumbleTimer > 0.05;
  const activeMod = !isTitle && !isTumbling ? die.mod : null;
  const modMeta = activeMod ? FACE_MOD_META[activeMod] : null;
  const hasUpgradedFaces = !isTitle && Array.isArray(die.faces) && die.faces.some(f => f.mod !== null || f.value > 6);

  ctx.save();
  // Grounded shadow on felt
  ctx.save();
  ctx.translate(px, die.targetY ? die.targetY + 12 : py + shadowOffset);
  const shadowScale = clamp(1 - Math.abs(liftY) / 160, 0.72, 1.05);
  ctx.scale(shadowScale, shadowScale * 0.38);
  tracePixelRect(ctx, -half, -half, size, size, 18);
  ctx.fillStyle = 'rgba(0, 0, 0, 0.44)';
  ctx.fill();
  ctx.restore();

  // Die body transform
  ctx.translate(px, py);
  ctx.rotate(die.angle || 0);
  const sc = (die.scale || 1) + (die.hop ? die.hop * 0.14 : 0);
  ctx.scale(sc, sc);

  // Selection or Mod glow halo
  if (!isTitle && die.selected) {
    tracePixelRect(ctx, -half - 6, -half - 6, size + 12, size + 12, 16);
    ctx.fillStyle = 'rgba(246, 202, 101, 0.18)';
    ctx.fill();
    ctx.strokeStyle = COLORS.brassBright;
    ctx.lineWidth = 3;
    ctx.stroke();
  } else if (modMeta && !debuffed) {
    tracePixelRect(ctx, -half - 4, -half - 4, size + 8, size + 8, 15);
    ctx.strokeStyle = modMeta.color;
    ctx.globalAlpha = 0.45 + 0.2 * Math.sin(state.time * 4 + die.id);
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.globalAlpha = 1;
  }

  // Resolve displayed value (tumble animation or actual value)
  let val = die.value;
  if (isTumbling) {
    if (Array.isArray(die.faces) && die.faces.length > 0) {
      val = die.faces[(Math.floor(state.time * 24) + die.id) % die.faces.length].value;
    } else {
      val = 1 + ((Math.floor(state.time * 24) + die.id) % DICE_SIDES);
    }
  }

  if (diceSpriteReady && val >= 1 && val <= 6) {
    drawDiceSpriteFrame(ctx, val, half, size);

    if (debuffed) {
      tracePixelRect(ctx, -half + 2, -half + 2, size - 4, size - 4, 12);
      ctx.fillStyle = 'rgba(120, 20, 30, 0.42)';
      ctx.fill();
    } else if (modMeta) {
      tracePixelRect(ctx, -half + 2, -half + 2, size - 4, size - 4, 12);
      ctx.fillStyle = modMeta.color;
      ctx.globalAlpha = 0.25;
      ctx.fill();
      ctx.globalAlpha = 1;
      tracePixelRect(ctx, -half + 0.5, -half + 0.5, size - 1, size - 1, 14);
      ctx.strokeStyle = modMeta.border;
      ctx.lineWidth = 2.5;
      ctx.stroke();
    }

    if (activeMod === 'emerald' && !debuffed) {
      ctx.save();
      tracePixelRect(ctx, -half, -half, size, size, 14);
      ctx.clip();
      ctx.fillStyle = 'rgba(255, 255, 255, 0.34)';
      ctx.beginPath();
      ctx.moveTo(-half, -half + 18);
      ctx.lineTo(-half + 26, -half);
      ctx.lineTo(half, half - 26);
      ctx.lineTo(half - 18, half);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    }
  } else {
    // Forged >6 or pre-load fallback face with numeric value
    tracePixelRect(ctx, -half, -half + 7, size, size, 14);
    ctx.fillStyle = debuffed ? '#6B4848' : (modMeta ? modMeta.border : COLORS.ivoryDeep);
    ctx.fill();

    tracePixelRect(ctx, -half, -half, size, size, 14);
    ctx.fillStyle = debuffed ? '#C4A0A0' : (modMeta ? modMeta.bg : COLORS.ivory);
    ctx.fill();

    tracePixelRect(ctx, -half + 0.5, -half + 0.5, size - 1, size - 1, 14);
    ctx.strokeStyle = die.selected
      ? COLORS.brassBright
      : (modMeta ? modMeta.border : 'rgba(24, 34, 48, 0.65)');
    ctx.lineWidth = die.selected ? 2.5 : 2;
    ctx.stroke();

    ctx.fillStyle = debuffed ? '#5C2626' : (modMeta ? modMeta.color : '#1A2433');
    ctx.font = `900 ${Math.round(size * 0.46)}px ui-monospace, SFMono-Regular, Menlo, monospace`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(String(val), 0, 2);
  }

  // Forged value > 6 top-left numeric badge
  if (!isTitle && !isTumbling && val > 6) {
    ctx.fillStyle = '#140E24';
    ctx.fillRect(-half + 6, -half + 6, 26, 17);
    ctx.strokeStyle = COLORS.brassBright;
    ctx.lineWidth = 1;
    ctx.strokeRect(-half + 6, -half + 6, 26, 17);
    ctx.fillStyle = COLORS.goldLight;
    ctx.font = '900 11px ui-monospace, SFMono-Regular, Menlo, monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('+' + val, -half + 19, -half + 14.5);
  }

  // Face mod top-right badge (Ruby, Sapphire, Topaz, Emerald, Amethyst)
  if (!isTitle && !isTumbling && modMeta) {
    const badgeText = activeMod === 'wild' && die.selected && die.effectiveValue && die.effectiveValue !== die.value
      ? `★=${die.effectiveValue}`
      : modMeta.badge;
    const bw = 44;
    ctx.fillStyle = modMeta.bg;
    ctx.fillRect(half - bw - 6, -half + 6, bw, 17);
    ctx.strokeStyle = modMeta.color;
    ctx.lineWidth = 1;
    ctx.strokeRect(half - bw - 6, -half + 6, bw, 17);
    ctx.fillStyle = modMeta.color;
    ctx.font = '800 10px ui-monospace, SFMono-Regular, Menlo, monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(badgeText, half - bw / 2 - 6, -half + 14.5);
  }

  // Small bottom-left craft indicator dot if this die owns any upgraded faces
  if (hasUpgradedFaces && !isTumbling) {
    ctx.beginPath();
    ctx.arc(-half + 12, half - 12, 4, 0, Math.PI * 2);
    ctx.fillStyle = COLORS.brassBright;
    ctx.fill();
    ctx.strokeStyle = '#140E24';
    ctx.lineWidth = 1;
    ctx.stroke();
  }

  // Boss debuff cross mark
  if (debuffed && !isTumbling) {
    ctx.strokeStyle = 'rgba(220, 38, 38, 0.72)';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(-half + 16, -half + 16);
    ctx.lineTo(half - 16, half - 16);
    ctx.moveTo(half - 16, -half + 16);
    ctx.lineTo(-half + 16, half - 16);
    ctx.stroke();
  }

  // Score hit flash
  if (die.flash > 0.01) {
    tracePixelRect(ctx, -half, -half, size, size, 14);
    ctx.fillStyle = die.flashColor || '#FFFFFF';
    ctx.globalAlpha = die.flash * 0.45;
    ctx.fill();
  }
  ctx.restore();

  // Small unboxed label under die when selected, modded, or debuffed
  if (!isTitle) {
    ctx.save();
    ctx.font = '700 11.5px ui-monospace, SFMono-Regular, Menlo, monospace';
    ctx.textAlign = 'center';
    if (die.selected) {
      ctx.fillStyle = COLORS.brassBright;
      ctx.fillText(activeMod === 'wild' && die.effectiveValue ? `▲ WILD (${die.effectiveValue})` : '▲ SELECTED', px, die.targetY + 62);
    } else if (debuffed) {
      ctx.fillStyle = COLORS.multLight;
      ctx.fillText('0 POINTS', px, die.targetY + 62);
    } else if (modMeta) {
      ctx.fillStyle = modMeta.color;
      ctx.fillText(`[${die.id + 1}] ${modMeta.short}`, px, die.targetY + 62);
    } else {
      ctx.fillStyle = 'rgba(180, 210, 196, 0.45)';
      ctx.fillText('[' + (die.id + 1) + ']', px, die.targetY + 62);
    }
    ctx.restore();
  }
}

export function drawPlayingCard(ctx, state, inst, cx, cy, w, h, opts = {}) {
  const {
    tilt = 0,
    scale = 1,
    debuffed = false,
    hovered = false,
    dragging = false,
    showFooterTag = true
  } = opts;

  const def = CARD_BY_ID[inst.cardId];
  const isVoid = inst.edition === 'void';
  const isGilded = inst.edition === 'gilded';
  const isCrimson = inst.edition === 'crimson';
  const isPrism = inst.edition === 'prism';

  const hw = w / 2;
  const hh = h / 2;
  const r = 9;

  ctx.save();
  ctx.translate(cx, cy - (inst.bounce || 0) * 16 - (hovered && !dragging ? 7 : 0));
  ctx.rotate(tilt + Math.sin(state.time * 2.2 + inst.uid) * (hovered ? 0.018 : 0.008));
  const sc = scale * (1 + (inst.bounce || 0) * 0.1) * (dragging ? 1.07 : 1);
  ctx.scale(sc, sc);

  // 1. UNDER-CARD SHADOWS & EDITION AURAS
  if (isCrimson) {
    const pulse = 0.5 + 0.5 * Math.sin(state.time * 3.8 + inst.uid * 1.3);
    const emberGrad = ctx.createRadialGradient(0, hh * 0.25, 6, 0, hh * 0.2, Math.max(w, h) * 0.85);
    emberGrad.addColorStop(0, `rgba(251, 146, 60, ${0.58 + pulse * 0.22})`);
    emberGrad.addColorStop(0.38, `rgba(225, 29, 72, ${0.42 + pulse * 0.18})`);
    emberGrad.addColorStop(0.72, `rgba(159, 18, 57, ${0.18 + pulse * 0.08})`);
    emberGrad.addColorStop(1, 'rgba(136, 19, 55, 0)');
    ctx.save();
    ctx.fillStyle = emberGrad;
    ctx.fillRect(-hw - 26, -hh - 20, w + 52, h + 46);

    ctx.shadowColor = '#FB7185';
    ctx.shadowBlur = 14 + pulse * 8;
    tracePixelRect(ctx, -hw - 1.5, -hh - 1.5, w + 3, h + 3, r + 1);
    ctx.strokeStyle = `rgba(251, 146, 60, ${0.65 + pulse * 0.35})`;
    ctx.lineWidth = 2.5;
    ctx.stroke();
    ctx.restore();
  } else if (isPrism) {
    const pulse = 0.5 + 0.5 * Math.sin(state.time * 3.0 + inst.uid * 0.9);
    ctx.save();
    ctx.shadowColor = '#38BDF8';
    ctx.shadowBlur = 16 + pulse * 6;
    tracePixelRect(ctx, -hw - 1.5, -hh - 1.5, w + 3, h + 3, r + 1);
    ctx.strokeStyle = '#E0F2FE';
    ctx.lineWidth = 2.5;
    ctx.stroke();
    ctx.restore();
  } else if (isVoid) {
    const mist = 0.5 + 0.5 * Math.sin(state.time * 2.4 + inst.uid);
    ctx.save();
    ctx.shadowColor = `rgba(94, 234, 212, ${0.35 + mist * 0.2})`;
    ctx.shadowBlur = 18;
    tracePixelRect(ctx, -hw - 1, -hh - 1, w + 2, h + 2, r + 1);
    ctx.strokeStyle = 'rgba(203, 213, 225, 0.45)';
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.restore();
  } else {
    ctx.save();
    tracePixelRect(ctx, -hw + (dragging ? 10 : 3), -hh + (dragging ? 16 : 8), w, h, r);
    ctx.fillStyle = dragging ? 'rgba(0,0,0,0.55)' : 'rgba(0,0,0,0.38)';
    ctx.fill();
    ctx.restore();
  }

  if (isGilded) {
    ctx.save();
    ctx.shadowColor = 'rgba(245, 205, 121, 0.38)';
    ctx.shadowBlur = 10;
    tracePixelRect(ctx, -hw - 1, -hh - 1, w + 2, h + 2, r + 1);
    ctx.strokeStyle = '#F5CD79';
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.restore();
  }

  if (cardsSpriteReady && CARD_RANK_ORDER.includes(def.rank) && CARD_SUIT_ROW[def.suit] !== undefined) {
    ctx.save();
    tracePixelRect(ctx, -hw, -hh, w, h, r);
    ctx.clip();
    if (isVoid) ctx.globalAlpha = 0.85;
    drawCardSpriteFrame(ctx, def.rank, def.suit, hw, hh, w, h);
    ctx.globalAlpha = 1;

    if (isVoid) {
      ctx.fillStyle = 'rgba(13, 38, 48, 0.42)';
      ctx.fillRect(-hw, -hh, w, h);
    } else if (isCrimson) {
      ctx.fillStyle = 'rgba(159, 18, 57, 0.20)';
      ctx.fillRect(-hw, -hh, w, h);
    } else if (isPrism) {
      ctx.fillStyle = 'rgba(56, 189, 248, 0.14)';
      ctx.fillRect(-hw, -hh, w, h);
    } else if (isGilded) {
      ctx.fillStyle = 'rgba(245, 205, 121, 0.12)';
      ctx.fillRect(-hw, -hh, w, h);
    }
    ctx.restore();
  } else {
    // Minimal pre-load fallback
    tracePixelRect(ctx, -hw, -hh, w, h, r);
    ctx.fillStyle = '#EFE8D8';
    ctx.fill();
    ctx.fillStyle = '#1E293B';
    ctx.font = `900 ${Math.round(w * 0.22)}px ui-monospace, SFMono-Regular, Menlo, monospace`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(def.rank, 0, 0);
  }

  // Mnemonic bottom strip right on the card
  if (showFooterTag) {
    const tagText = def.isScaling && inst.scalingBonus > 0
      ? (def.isScalingXMult
          ? `x${Math.round((1 + inst.scalingBonus) * 100) / 100} MULT`
          : `+${inst.scalingBonus} MULT`)
      : def.tag;
    const stripH = 22;
    ctx.fillStyle = isVoid
      ? 'rgba(15, 42, 52, 0.78)'
      : isCrimson
        ? 'rgba(28, 6, 12, 0.88)'
        : isPrism
          ? 'rgba(15, 23, 42, 0.88)'
          : 'rgba(16, 28, 36, 0.88)';
    ctx.fillRect(-hw + 7, hh - stripH - 7, w - 14, stripH);
    ctx.fillStyle = def.isScaling && inst.scalingBonus > 0
      ? COLORS.goldLight
      : (isVoid ? '#99F6E4' : isCrimson ? '#FED7AA' : isPrism ? '#E0F2FE' : '#F8FAFC');
    ctx.font = `800 ${Math.max(10, Math.round(w * 0.095))}px ui-monospace, SFMono-Regular, Menlo, monospace`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(tagText, 0, hh - stripH / 2 - 6.5);
  }

  if (isGilded || isCrimson || isPrism || isVoid) {
    ctx.save();
    tracePixelRect(ctx, -hw, -hh, w, h, r);
    ctx.clip();

    if (isGilded) {
      const sweep = ((state.time * 0.48 + inst.uid * 0.37) % 2.6) - 0.8;
      const gx = -hw + sweep * w * 1.4;
      const fg = ctx.createLinearGradient(gx - 30, -hh, gx + 30, hh);
      fg.addColorStop(0, 'rgba(245, 205, 121, 0)');
      fg.addColorStop(0.45, 'rgba(245, 205, 121, 0.18)');
      fg.addColorStop(0.5, 'rgba(255, 248, 220, 0.36)');
      fg.addColorStop(0.55, 'rgba(212, 163, 89, 0.16)');
      fg.addColorStop(1, 'rgba(245, 205, 121, 0)');
      ctx.fillStyle = fg;
      ctx.fillRect(-hw, -hh, w, h);
    } else if (isCrimson) {
      const pulse = 0.5 + 0.5 * Math.sin(state.time * 3.8 + inst.uid * 1.3);
      ctx.fillStyle = `rgba(254, 215, 170, ${0.55 + pulse * 0.35})`;
      ctx.fillRect(-hw + 6, hh - 3.5, w - 12, 3);
    } else if (isPrism) {
      // Prism-Cut: Twin crisp diamond refraction laser beams + 4-point crystal star sparkles
      const sweep = ((state.time * 0.95 + inst.uid * 0.43) % 2.4) - 0.7;
      const gx = -hw + sweep * w * 1.5;
      const glint = ctx.createLinearGradient(gx - 24, -hh, gx + 24, hh);
      glint.addColorStop(0, 'rgba(255, 255, 255, 0)');
      glint.addColorStop(0.35, 'rgba(56, 189, 248, 0.25)');
      glint.addColorStop(0.48, 'rgba(255, 255, 255, 0.78)');
      glint.addColorStop(0.54, 'rgba(244, 114, 182, 0.32)');
      glint.addColorStop(1, 'rgba(255, 255, 255, 0)');
      ctx.fillStyle = glint;
      ctx.fillRect(-hw, -hh, w, h);

      // 4-point diamond starburst glints on crystal vertices
      const starPositions = [
        [-hw * 0.48, -hh * 0.25],
        [hw * 0.48, -hh * 0.25],
        [0, hh * 0.28],
        [-hw * 0.35, hh * 0.45]
      ];
      starPositions.forEach(([sx, sy], idx) => {
        const twinkle = Math.max(0, Math.sin(state.time * 4.2 + inst.uid * 2 + idx * 1.7));
        if (twinkle > 0.15) {
          const arm = 4 + twinkle * 6;
          ctx.save();
          ctx.translate(sx, sy);
          ctx.fillStyle = `rgba(255, 255, 255, ${twinkle * 0.92})`;
          ctx.beginPath();
          ctx.moveTo(0, -arm);
          ctx.lineTo(1.4, -1.4);
          ctx.lineTo(arm, 0);
          ctx.lineTo(1.4, 1.4);
          ctx.lineTo(0, arm);
          ctx.lineTo(-1.4, 1.4);
          ctx.lineTo(-arm, 0);
          ctx.lineTo(-1.4, -1.4);
          ctx.closePath();
          ctx.fill();
          ctx.restore();
        }
      });
    } else if (isVoid) {
      const wispY = Math.sin(state.time * 1.8 + inst.uid) * (hh * 0.4);
      const phantomGrad = ctx.createRadialGradient(0, wispY, 4, 0, wispY, w * 0.75);
      phantomGrad.addColorStop(0, 'rgba(94, 234, 212, 0.14)');
      phantomGrad.addColorStop(0.55, 'rgba(203, 213, 225, 0.06)');
      phantomGrad.addColorStop(1, 'rgba(15, 23, 42, 0)');
      ctx.fillStyle = phantomGrad;
      ctx.fillRect(-hw, -hh, w, h);
    }

    ctx.restore();
  }

  if (inst.edition !== 'standard') {
    const edShort = EDITIONS[inst.edition].short || inst.edition.toUpperCase().slice(0, 4);
    ctx.fillStyle = 'rgba(10, 14, 24, 0.90)';
    ctx.fillRect(hw - 44, -hh + 8, 37, 16);
    ctx.fillStyle = EDITIONS[inst.edition].color;
    ctx.font = '800 9px ui-monospace, SFMono-Regular, Menlo, monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(edShort, hw - 25.5, -hh + 16.5);
  }

  // Debuffed overlay (Active boss curse)
  if (debuffed) {
    tracePixelRect(ctx, -hw, -hh, w, h, r);
    ctx.fillStyle = 'rgba(15, 8, 12, 0.56)';
    ctx.fill();
    ctx.strokeStyle = COLORS.multRed;
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(-hw + 16, -hh + 20);
    ctx.lineTo(hw - 16, hh - 20);
    ctx.moveTo(hw - 16, -hh + 20);
    ctx.lineTo(-hw + 16, hh - 20);
    ctx.stroke();
  }

  // Trigger flash pulse
  if (inst.flash > 0.02) {
    tracePixelRect(ctx, -hw, -hh, w, h, r);
    ctx.fillStyle = inst.pulseColor || '#FFFFFF';
    ctx.globalAlpha = inst.flash * 0.42;
    ctx.fill();
    ctx.globalAlpha = 1;
  }

  // 5. CRISP OUTER CARD STROKE
  tracePixelRect(ctx, -hw + 0.5, -hh + 0.5, w - 1, h - 1, r);
  if (hovered) {
    ctx.strokeStyle = COLORS.brassBright;
    ctx.lineWidth = 2.5;
  } else if (isVoid) {
    ctx.strokeStyle = '#5EEAD4';
    ctx.lineWidth = 2;
  } else if (isGilded) {
    ctx.strokeStyle = '#D4A359';
    ctx.lineWidth = 2.2;
  } else if (isCrimson) {
    ctx.strokeStyle = '#FB923C';
    ctx.lineWidth = 2.2;
  } else if (isPrism) {
    ctx.strokeStyle = '#7DD3FC';
    ctx.lineWidth = 2.2;
  } else {
    ctx.strokeStyle = 'rgba(20, 30, 38, 0.55)';
    ctx.lineWidth = 1.5;
  }
  ctx.stroke();

  ctx.restore();
}

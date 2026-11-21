import { COLORS } from '../config/colors.js';
import { EDITIONS } from '../config/editions.js';
import { CARD_BY_ID } from '../config/cards.js';
import { DICE_SIDES, DICE_LAYOUT, FACE_MOD_META, getDicePipCoords } from '../config/dices.js';

export function clamp(v, lo, hi) {
  return Math.max(lo, Math.min(hi, v));
}

export function lerp(a, b, t) {
  return a + (b - a) * t;
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
      spades: COLORS.negSpades,
      hearts: COLORS.negHearts,
      diamonds: COLORS.negDiamonds,
      clubs: COLORS.negClubs
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

  // Outer shadow/lip
  tracePixelRect(ctx, -half, -half + 3, size, size, 10);
  ctx.fillStyle = modMeta ? modMeta.border : COLORS.ivoryDeep;
  ctx.fill();

  // Main face background
  tracePixelRect(ctx, -half, -half, size, size, 10);
  const grad = ctx.createLinearGradient(-half, -half, half, half);
  if (face.mod === 'glass') {
    grad.addColorStop(0, '#E0F2FE');
    grad.addColorStop(0.5, '#A5F3FC');
    grad.addColorStop(1, '#38BDF8');
  } else if (face.mod === 'gold') {
    grad.addColorStop(0, '#FEF9C3');
    grad.addColorStop(0.6, '#FDE047');
    grad.addColorStop(1, '#CA8A04');
  } else if (face.mod === 'mult') {
    grad.addColorStop(0, '#FFF1F2');
    grad.addColorStop(0.7, '#FECDD3');
    grad.addColorStop(1, '#FB7185');
  } else if (face.mod === 'chips') {
    grad.addColorStop(0, '#F0F9FF');
    grad.addColorStop(0.7, '#BAE6FD');
    grad.addColorStop(1, '#38BDF8');
  } else if (face.mod === 'wild') {
    grad.addColorStop(0, '#FAF5FF');
    grad.addColorStop(0.6, '#F5D0FE');
    grad.addColorStop(1, '#E879F9');
  } else {
    grad.addColorStop(0, '#FFFDF7');
    grad.addColorStop(0.65, COLORS.ivory);
    grad.addColorStop(1, COLORS.ivoryShade);
  }
  ctx.fillStyle = grad;
  ctx.fill();

  // Border
  tracePixelRect(ctx, -half + 0.5, -half + 0.5, size - 1, size - 1, 10);
  ctx.strokeStyle = (selected || hovered)
    ? COLORS.brassBright
    : (modMeta ? modMeta.border : 'rgba(24, 34, 48, 0.65)');
  ctx.lineWidth = (selected || hovered) ? 2.5 : (modMeta ? 2 : 1.5);
  ctx.stroke();

  // Pips or forged high-value numeral
  const pipTable = getDicePipCoords(size * 0.24);
  const pipCoords = pipTable[val];
  const pipColor = modMeta
    ? modMeta.bg
    : (val === 1 ? COLORS.suitHearts : '#1A2433');

  if (pipCoords && val <= 9) {
    const pipR = val === 1 ? size * 0.115 : (val > 6 ? size * 0.072 : size * 0.086);
    for (const [ox, oy] of pipCoords) {
      ctx.beginPath();
      ctx.arc(ox, oy, pipR, 0, Math.PI * 2);
      ctx.fillStyle = pipColor;
      ctx.fill();
    }
  } else {
    ctx.fillStyle = pipColor;
    ctx.font = `900 ${Math.round(size * 0.42)}px ui-monospace, SFMono-Regular, Menlo, monospace`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(String(val), 0, 0);
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

  // 3D beveled side lip
  tracePixelRect(ctx, -half, -half + 7, size, size, 14);
  ctx.fillStyle = debuffed ? '#6B4848' : (modMeta ? modMeta.border : COLORS.ivoryDeep);
  ctx.fill();

  // Main die face
  tracePixelRect(ctx, -half, -half, size, size, 14);
  const grad = ctx.createLinearGradient(-half, -half, half, half);
  if (debuffed) {
    grad.addColorStop(0, '#D4B8B8');
    grad.addColorStop(1, '#A98888');
  } else if (activeMod === 'glass') {
    grad.addColorStop(0, '#ECFEFF');
    grad.addColorStop(0.5, '#A5F3FC');
    grad.addColorStop(1, '#38BDF8');
  } else if (activeMod === 'gold') {
    grad.addColorStop(0, '#FEF9C3');
    grad.addColorStop(0.6, '#FDE047');
    grad.addColorStop(1, '#CA8A04');
  } else if (activeMod === 'mult') {
    grad.addColorStop(0, '#FFF1F2');
    grad.addColorStop(0.65, '#FFE4E6');
    grad.addColorStop(1, '#FDA4AF');
  } else if (activeMod === 'chips') {
    grad.addColorStop(0, '#F0F9FF');
    grad.addColorStop(0.65, '#E0F2FE');
    grad.addColorStop(1, '#7DD3FC');
  } else if (activeMod === 'wild') {
    grad.addColorStop(0, '#FAF5FF');
    grad.addColorStop(0.6, '#F5D0FE');
    grad.addColorStop(1, '#E879F9');
  } else {
    grad.addColorStop(0, '#FFFDF7');
    grad.addColorStop(0.65, COLORS.ivory);
    grad.addColorStop(1, COLORS.ivoryShade);
  }
  ctx.fillStyle = grad;
  ctx.fill();

  // Glass diagonal sheen
  if (activeMod === 'glass' && !debuffed) {
    ctx.save();
    tracePixelRect(ctx, -half, -half, size, size, 14);
    ctx.clip();
    ctx.fillStyle = 'rgba(255, 255, 255, 0.38)';
    ctx.beginPath();
    ctx.moveTo(-half, -half + 18);
    ctx.lineTo(-half + 26, -half);
    ctx.lineTo(half, half - 26);
    ctx.lineTo(half - 18, half);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }

  // Recessed inner bevel square
  tracePixelRect(ctx, -half + 7, -half + 7, size - 14, size - 14, 10);
  ctx.strokeStyle = modMeta ? modMeta.color : 'rgba(255,255,255,0.65)';
  ctx.lineWidth = 1.5;
  ctx.stroke();

  // Crisp outer outline
  tracePixelRect(ctx, -half + 0.5, -half + 0.5, size - 1, size - 1, 14);
  ctx.strokeStyle = die.selected
    ? COLORS.brassBright
    : (modMeta ? modMeta.border : 'rgba(24, 34, 48, 0.65)');
  ctx.lineWidth = die.selected ? 2.5 : (modMeta ? 2.5 : 2);
  ctx.stroke();

  // Pips (or high forged value)
  let val = die.value;
  if (isTumbling) {
    if (Array.isArray(die.faces) && die.faces.length > 0) {
      val = die.faces[(Math.floor(state.time * 24) + die.id) % die.faces.length].value;
    } else {
      val = 1 + ((Math.floor(state.time * 24) + die.id) % DICE_SIDES);
    }
  }
  const pOff = size * 0.255;
  const pipTable = getDicePipCoords(pOff);
  const pipCoords = pipTable[val];
  const pipColor = debuffed
    ? '#5C2626'
    : (modMeta ? modMeta.bg : (val === 1 ? COLORS.suitHearts : '#1A2433'));

  if (pipCoords && val <= 9) {
    const pipR = val === 1 ? size * 0.125 : (val > 6 ? size * 0.076 : size * 0.092);
    for (const [ox, oy] of pipCoords) {
      ctx.beginPath();
      ctx.arc(ox, oy + 1.5, pipR, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(255,255,255,0.55)';
      ctx.fill();

      ctx.beginPath();
      ctx.arc(ox, oy, pipR, 0, Math.PI * 2);
      ctx.fillStyle = pipColor;
      ctx.fill();
    }
  } else {
    ctx.fillStyle = pipColor;
    ctx.font = `900 ${Math.round(size * 0.44)}px ui-monospace, SFMono-Regular, Menlo, monospace`;
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

  // Face mod top-right badge (Ruby, Sapphire, Gold, Glass, Wild)
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
      ctx.fillText('0 CHIPS', px, die.targetY + 62);
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
  const isNeg = inst.edition === 'negative';
  const isFoil = inst.edition === 'foil';        
  const isHolo = inst.edition === 'holographic'; 
  const isPoly = inst.edition === 'polychrome';
  const isDarkCard = isNeg || isHolo || isPoly;
  const suitColor = isHolo
    ? ({ spades: '#FDE68A', hearts: '#FB7185', diamonds: '#FBBF24', clubs: '#FDBA74' }[def.suit])
    : isPoly
      ? ({ spades: '#E0F2FE', hearts: '#F472B6', diamonds: '#FDE047', clubs: '#5EEAD4' }[def.suit])
      : getSuitColor(def.suit, isNeg);

  const hw = w / 2;
  const hh = h / 2;
  const r = 9;

  ctx.save();
  ctx.translate(cx, cy - (inst.bounce || 0) * 16 - (hovered && !dragging ? 7 : 0));
  ctx.rotate(tilt + Math.sin(state.time * 2.2 + inst.uid) * (hovered ? 0.018 : 0.008));
  const sc = scale * (1 + (inst.bounce || 0) * 0.1) * (dragging ? 1.07 : 1);
  ctx.scale(sc, sc);

  // 1. UNDER-CARD SHADOWS & EDITION AURAS
  if (isHolo) {
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
  } else if (isPoly) {
    const pulse = 0.5 + 0.5 * Math.sin(state.time * 3.0 + inst.uid * 0.9);
    ctx.save();
    ctx.shadowColor = '#38BDF8';
    ctx.shadowBlur = 16 + pulse * 6;
    tracePixelRect(ctx, -hw - 1.5, -hh - 1.5, w + 3, h + 3, r + 1);
    ctx.strokeStyle = '#E0F2FE';
    ctx.lineWidth = 2.5;
    ctx.stroke();
    ctx.restore();
  } else if (isNeg) {
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

  if (isFoil) {
    ctx.save();
    ctx.shadowColor = 'rgba(245, 205, 121, 0.38)';
    ctx.shadowBlur = 10;
    tracePixelRect(ctx, -hw - 1, -hh - 1, w + 2, h + 2, r + 1);
    ctx.strokeStyle = '#F5CD79';
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.restore();
  }

  tracePixelRect(ctx, -hw, -hh + 4, w, h, r);
  ctx.fillStyle = isNeg
    ? 'rgba(20, 48, 56, 0.72)'
    : isHolo
      ? '#450A0A'
      : isPoly
        ? '#1E1B4B'
        : isFoil
          ? '#926B28'
          : '#BEB5A1';
  ctx.fill();

  tracePixelRect(ctx, -hw, -hh, w, h, r);
  if (isNeg) {
    const ng = ctx.createLinearGradient(-hw, -hh, hw, hh);
    ng.addColorStop(0, 'rgba(13, 21, 32, 0.78)');
    ng.addColorStop(0.5, 'rgba(9, 14, 24, 0.74)');
    ng.addColorStop(1, 'rgba(15, 29, 38, 0.80)');
    ctx.fillStyle = ng;
  } else if (isHolo) {
    const bg = ctx.createLinearGradient(0, -hh, 0, hh);
    bg.addColorStop(0, '#1C080E');
    bg.addColorStop(0.45, '#380A18');
    bg.addColorStop(0.78, '#7F1D1D');
    bg.addColorStop(1, '#EA580C');
    ctx.fillStyle = bg;
  } else if (isPoly) {
    const bg = ctx.createLinearGradient(-hw, -hh, hw, hh);
    bg.addColorStop(0, '#0F172A');
    bg.addColorStop(0.35, '#1E1B4B');
    bg.addColorStop(0.7, '#164E63');
    bg.addColorStop(1, '#3B0764');
    ctx.fillStyle = bg;
  } else if (isFoil) {
    const bg = ctx.createLinearGradient(-hw, -hh, hw, hh);
    bg.addColorStop(0, '#FFFDF7');
    bg.addColorStop(0.6, '#FBF3DC');
    bg.addColorStop(1, '#EFE0B9');
    ctx.fillStyle = bg;
  } else {
    const bg = ctx.createLinearGradient(-hw, -hh, hw, hh);
    bg.addColorStop(0, '#FFFDF9');
    bg.addColorStop(1, '#EFE8D8');
    ctx.fillStyle = bg;
  }
  ctx.fill();

  // 2B. BACKGROUND MOSAIC / EMBER VEINS (Before Rank & Suit so icons stay super crisp!)
  if (isHolo || isPoly) {
    ctx.save();
    tracePixelRect(ctx, -hw, -hh, w, h, r);
    ctx.clip();

    if (isHolo) {
      // Glowing molten core at bottom of card
      const pulse = 0.5 + 0.5 * Math.sin(state.time * 4.0 + inst.uid);
      const lava = ctx.createRadialGradient(0, hh * 0.85, 2, 0, hh * 0.65, w * 0.9);
      lava.addColorStop(0, `rgba(254, 240, 138, ${0.42 + pulse * 0.22})`);
      lava.addColorStop(0.35, `rgba(249, 115, 22, ${0.34 + pulse * 0.14})`);
      lava.addColorStop(0.7, 'rgba(225, 29, 72, 0.16)');
      lava.addColorStop(1, 'rgba(28, 8, 14, 0)');
      ctx.fillStyle = lava;
      ctx.fillRect(-hw, -hh, w, h);


      // Rising animated ember sparks inside the card
      for (let i = 0; i < 9; i++) {
        const seed = inst.uid * 17 + i * 31;
        const speed = 0.42 + (i % 3) * 0.18;
        const prog = (state.time * speed + seed * 0.13) % 1;
        const sy = hh - prog * (h * 0.92);
        const sx = Math.sin(prog * 5 + seed) * (hw * 0.72);
        const sr = (1 - prog * 0.65) * (2.2 + (i % 2) * 1.1);
        ctx.beginPath();
        ctx.arc(sx, sy, sr, 0, Math.PI * 2);
        ctx.fillStyle = i % 2 === 0
          ? `rgba(254, 240, 138, ${(1 - prog) * 0.95})`
          : `rgba(251, 113, 133, ${(1 - prog) * 0.9})`;
        ctx.fill();
      }
    } else if (isPoly) {
      const t = state.time * 2.0 + inst.uid;
      const facets = [
        { pts: [[-hw, -hh], [0, -hh], [-hw * 0.45, -hh * 0.25], [-hw, 0]], col: `rgba(56, 189, 248, ${0.18 + 0.10 * Math.sin(t)})` },
        { pts: [[0, -hh], [hw, -hh], [hw, 0], [hw * 0.45, -hh * 0.25]], col: `rgba(192, 132, 252, ${0.18 + 0.10 * Math.sin(t + 1.4)})` },
        { pts: [[0, -hh], [hw * 0.48, -hh * 0.25], [0, 0], [-hw * 0.48, -hh * 0.25]], col: `rgba(224, 242, 254, ${0.14 + 0.12 * Math.sin(t + 2.6)})` },
        // Left middle facet
        { pts: [[-hw, 0], [-hw * 0.48, -hh * 0.25], [0, 0], [-hw * 0.48, hh * 0.28], [-hw, hh * 0.5]], col: `rgba(45, 212, 191, ${0.16 + 0.10 * Math.sin(t + 3.8)})` },
        // Right middle facet
        { pts: [[hw, 0], [hw, hh * 0.5], [hw * 0.48, hh * 0.28], [0, 0], [hw * 0.48, -hh * 0.25]], col: `rgba(244, 114, 182, ${0.16 + 0.10 * Math.sin(t + 4.9)})` },
        // Center lower diamond
        { pts: [[0, 0], [hw * 0.48, hh * 0.28], [0, hh * 0.72], [-hw * 0.48, hh * 0.28]], col: `rgba(125, 211, 252, ${0.16 + 0.12 * Math.sin(t + 5.7)})` },
        // Bottom facets
        { pts: [[-hw, hh * 0.5], [-hw * 0.48, hh * 0.28], [0, hh * 0.72], [-hw, hh]], col: `rgba(167, 139, 250, ${0.18 + 0.08 * Math.cos(t)})` },
        { pts: [[hw, hh * 0.5], [hw, hh], [0, hh * 0.72], [hw * 0.48, hh * 0.28]], col: `rgba(56, 189, 248, ${0.20 + 0.10 * Math.sin(t + 2.1)})` }
      ];

      for (const f of facets) {
        ctx.beginPath();
        f.pts.forEach(([px, py], idx) => {
          if (idx === 0) ctx.moveTo(px, py);
          else ctx.lineTo(px, py);
        });
        ctx.closePath();
        ctx.fillStyle = f.col;
        ctx.fill();
        ctx.strokeStyle = 'rgba(224, 242, 254, 0.28)';
        ctx.lineWidth = 1;
        ctx.stroke();
      }
    }
    ctx.restore();
  }

  // 3. INNER ART-DECO FILIGREE & EDITION BORDERS
  if (isFoil) {
    // Gilded-Bound: Thin, lustrous double gold/brass Art Deco lines + stepped corner fan motifs
    ctx.save();
    tracePixelRect(ctx, -hw + 4, -hh + 4, w - 8, h - 8, 6);
    ctx.strokeStyle = '#D4A359';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    tracePixelRect(ctx, -hw + 7.5, -hh + 7.5, w - 15, h - 15, 4);
    ctx.strokeStyle = '#F5CD79';
    ctx.lineWidth = 1;
    ctx.stroke();

    // Art Deco corner diamond accents
    ctx.strokeStyle = '#D4A359';
    ctx.lineWidth = 1.2;
    const corners = [
      [-hw + 8, -hh + 8, 1, 1],
      [hw - 8, -hh + 8, -1, 1],
      [-hw + 8, hh - 8, 1, -1],
      [hw - 8, hh - 8, -1, -1]
    ];
    for (const [cx0, cy0, dx, dy] of corners) {
      ctx.beginPath();
      ctx.moveTo(cx0, cy0 + dy * 10);
      ctx.lineTo(cx0 + dx * 10, cy0 + dy * 10);
      ctx.lineTo(cx0 + dx * 10, cy0);
      ctx.stroke();
    }
    ctx.restore();
  } else if (isHolo) {
    ctx.save();
    tracePixelRect(ctx, -hw + 5, -hh + 5, w - 10, h - 10, 5);
    ctx.strokeStyle = 'rgba(251, 146, 60, 0.55)';
    ctx.lineWidth = 1.2;
    ctx.stroke();
    ctx.restore();
  } else if (isPoly) {
    ctx.save();
    tracePixelRect(ctx, -hw + 5, -hh + 5, w - 10, h - 10, 5);
    ctx.strokeStyle = 'rgba(224, 242, 254, 0.55)';
    ctx.lineWidth = 1.2;
    ctx.stroke();
    ctx.restore();
  } else if (isNeg) {
    // Void-Etched: Cool turquoise-silver inner etched frame with dashed phantom filigree
    ctx.save();
    tracePixelRect(ctx, -hw + 5, -hh + 5, w - 10, h - 10, 5);
    ctx.strokeStyle = 'rgba(94, 234, 212, 0.42)';
    ctx.lineWidth = 1;
    ctx.setLineDash([4, 3]);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.restore();
  } else {
    tracePixelRect(ctx, -hw + 6, -hh + 6, w - 12, h - 12, 5);
    ctx.strokeStyle = 'rgba(24,34,48,0.12)';
    ctx.lineWidth = 1;
    ctx.stroke();
  }

  // Corner Rank & Suit (Top-left)
  ctx.fillStyle = suitColor;
  ctx.font = `900 ${Math.round(w * 0.19)}px ui-monospace, SFMono-Regular, Menlo, monospace`;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';
  ctx.fillText(def.rank, -hw + 10, -hh + 9);
  drawSuitIcon(ctx, def.suit, -hw + 18, -hh + 9 + w * 0.25, w * 0.075, suitColor);

  // Bottom-right mirrored mini rank & suit
  ctx.save();
  ctx.rotate(Math.PI);
  ctx.fillStyle = suitColor;
  ctx.font = `900 ${Math.round(w * 0.16)}px ui-monospace, SFMono-Regular, Menlo, monospace`;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';
  ctx.fillText(def.rank, -hw + 10, -hh + 9);
  ctx.restore();

  // Center court crest or bold suit medallion
  const isCourt = def.rank === 'K' || def.rank === 'Q' || def.rank === 'J';
  const isAce = def.rank === 'A';

  if (isCourt) {
    ctx.save();
    ctx.fillStyle = isDarkCard ? 'rgba(255, 255, 255, 0.08)' : 'rgba(217,164,65,0.13)';
    tracePixelRect(ctx, -w * 0.28, -h * 0.24, w * 0.56, h * 0.42, 6);
    ctx.fill();
    ctx.strokeStyle = isHolo
      ? 'rgba(251, 146, 60, 0.55)'
      : isPoly
        ? 'rgba(186, 230, 253, 0.55)'
        : isNeg
          ? 'rgba(148, 163, 184, 0.42)'
          : 'rgba(217,164,65,0.5)';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    // Tiny crown pixels above central suit
    ctx.fillStyle = isHolo ? '#FDE047' : isPoly ? '#E0F2FE' : isNeg ? '#5EEAD4' : '#C89128';
    const cw = w * 0.24;
    const cyCrown = -h * 0.17;
    ctx.beginPath();
    ctx.moveTo(-cw / 2, cyCrown + 9);
    ctx.lineTo(-cw / 2, cyCrown);
    ctx.lineTo(-cw / 6, cyCrown + 5);
    ctx.lineTo(0, cyCrown - 3);
    ctx.lineTo(cw / 6, cyCrown + 5);
    ctx.lineTo(cw / 2, cyCrown);
    ctx.lineTo(cw / 2, cyCrown + 9);
    ctx.closePath();
    ctx.fill();

    drawSuitIcon(ctx, def.suit, 0, h * 0.02, w * 0.17, suitColor);
    ctx.restore();
  } else if (isAce) {
    ctx.save();
    ctx.strokeStyle = isHolo
      ? 'rgba(251, 146, 60, 0.5)'
      : isPoly
        ? 'rgba(186, 230, 253, 0.5)'
        : isNeg
          ? 'rgba(94, 234, 212, 0.38)'
          : 'rgba(24,34,48,0.14)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(0, -4, w * 0.25, 0, Math.PI * 2);
    ctx.stroke();
    drawSuitIcon(ctx, def.suit, 0, -4, w * 0.21, suitColor);
    ctx.restore();
  } else {
    drawSuitIcon(ctx, def.suit, 0, -6, w * 0.18, suitColor);
  }

  // Mnemonic bottom strip right on the card
  if (showFooterTag) {
    const tagText = def.isScaling && inst.scalingBonus > 0
      ? `+${inst.scalingBonus} MULT`
      : def.tag;
    const stripH = 22;
    ctx.fillStyle = isNeg
      ? 'rgba(15, 42, 52, 0.78)'
      : isHolo
        ? 'rgba(28, 6, 12, 0.88)'
        : isPoly
          ? 'rgba(15, 23, 42, 0.88)'
          : 'rgba(16, 28, 36, 0.88)';
    ctx.fillRect(-hw + 7, hh - stripH - 7, w - 14, stripH);
    ctx.fillStyle = def.isScaling && inst.scalingBonus > 0
      ? COLORS.goldLight
      : (isNeg ? '#99F6E4' : isHolo ? '#FED7AA' : isPoly ? '#E0F2FE' : '#F8FAFC');
    ctx.font = `800 ${Math.max(10, Math.round(w * 0.095))}px ui-monospace, SFMono-Regular, Menlo, monospace`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(tagText, 0, hh - stripH / 2 - 6.5);
  }

  if (isFoil || isHolo || isPoly || isNeg) {
    ctx.save();
    tracePixelRect(ctx, -hw, -hh, w, h, r);
    ctx.clip();

    if (isFoil) {
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
    } else if (isHolo) {
      const pulse = 0.5 + 0.5 * Math.sin(state.time * 3.8 + inst.uid * 1.3);
      ctx.fillStyle = `rgba(254, 215, 170, ${0.55 + pulse * 0.35})`;
      ctx.fillRect(-hw + 6, hh - 3.5, w - 12, 3);
    } else if (isPoly) {
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
    } else if (isNeg) {
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

  // Debuffed overlay (The Blind Eye boss)
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
  } else if (isNeg) {
    ctx.strokeStyle = '#5EEAD4';
    ctx.lineWidth = 2;
  } else if (isFoil) {
    ctx.strokeStyle = '#D4A359';
    ctx.lineWidth = 2.2;
  } else if (isHolo) {
    ctx.strokeStyle = '#FB923C';
    ctx.lineWidth = 2.2;
  } else if (isPoly) {
    ctx.strokeStyle = '#7DD3FC';
    ctx.lineWidth = 2.2;
  } else {
    ctx.strokeStyle = 'rgba(20, 30, 38, 0.55)';
    ctx.lineWidth = 1.5;
  }
  ctx.stroke();

  ctx.restore();
}

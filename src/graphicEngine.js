import { COLORS } from './config/colors.js';
import { EDITIONS } from './config/editions.js';
import { CARD_BY_ID } from './config/cards.js';
import { DICE_SIDES, DICE_LAYOUT, getDicePipCoords } from './config/dices.js';

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
    ctx.beginPath();
    ctx.arc(0, -s * 0.42, r, 0, Math.PI * 2);
    ctx.arc(-s * 0.44, s * 0.12, r, 0, Math.PI * 2);
    ctx.arc(s * 0.44, s * 0.12, r, 0, Math.PI * 2);
    ctx.fill();
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

export function getSuitColor(suit, isNegative) {
  if (isNegative) {
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
  // Full viewport emerald casino felt with radial vignette
  const cx = state.vw / 2;
  const cy = state.vh / 2;
  const maxR = Math.hypot(cx, cy) * 1.05;
  const rad = ctx.createRadialGradient(cx, cy * 0.92, 40, cx, cy, maxR);
  rad.addColorStop(0, COLORS.feltCenter);
  rad.addColorStop(0.55, COLORS.feltMid);
  rad.addColorStop(1, COLORS.feltEdge);
  ctx.fillStyle = rad;
  ctx.fillRect(0, 0, state.vw, state.vh);

  // Subtle woven felt texture
  const patCanvas = getFeltPatternCanvas();
  if (patCanvas) {
    const pat = ctx.createPattern(patCanvas, 'repeat');
    if (pat) {
      ctx.fillStyle = pat;
      ctx.fillRect(0, 0, state.vw, state.vh);
    }
  }

  // Subtle decorative casino inlay arc
  ctx.save();
  ctx.strokeStyle = 'rgba(217, 164, 65, 0.07)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.ellipse(cx, cy + state.vh * 0.08, state.vw * 0.43, state.vh * 0.39, 0, 0, Math.PI * 2);
  ctx.stroke();
  ctx.restore();
}

export function drawDie(ctx, state, die, isTitle = false, debuffed = false) {
  const size = isTitle ? DICE_LAYOUT.titleSize : DICE_LAYOUT.size;
  const half = size / 2;
  const liftY = isTitle ? 0 : (die.selected ? -34 : 0) - die.hop * 22;
  const px = die.x;
  const py = die.y + liftY;
  const shadowOffset = isTitle ? 12 : (die.selected ? 28 : 10) + die.hop * 14;

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

  // Selection glow halo
  if (!isTitle && die.selected) {
    tracePixelRect(ctx, -half - 6, -half - 6, size + 12, size + 12, 16);
    ctx.fillStyle = 'rgba(246, 202, 101, 0.18)';
    ctx.fill();
    ctx.strokeStyle = COLORS.brassBright;
    ctx.lineWidth = 3;
    ctx.stroke();
  }

  // 3D beveled side lip
  tracePixelRect(ctx, -half, -half + 7, size, size, 14);
  ctx.fillStyle = debuffed ? '#6B4848' : COLORS.ivoryDeep;
  ctx.fill();

  // Main die face
  tracePixelRect(ctx, -half, -half, size, size, 14);
  const grad = ctx.createLinearGradient(-half, -half, half, half);
  if (debuffed) {
    grad.addColorStop(0, '#D4B8B8');
    grad.addColorStop(1, '#A98888');
  } else {
    grad.addColorStop(0, '#FFFDF7');
    grad.addColorStop(0.65, COLORS.ivory);
    grad.addColorStop(1, COLORS.ivoryShade);
  }
  ctx.fillStyle = grad;
  ctx.fill();

  // Recessed inner bevel square
  tracePixelRect(ctx, -half + 7, -half + 7, size - 14, size - 14, 10);
  ctx.strokeStyle = 'rgba(255,255,255,0.65)';
  ctx.lineWidth = 1.5;
  ctx.stroke();

  // Crisp outer outline
  tracePixelRect(ctx, -half + 0.5, -half + 0.5, size - 1, size - 1, 14);
  ctx.strokeStyle = die.selected ? COLORS.brassBright : 'rgba(24, 34, 48, 0.65)';
  ctx.lineWidth = die.selected ? 2.5 : 2;
  ctx.stroke();

  // Pips
  const val = die.tumbleTimer > 0.05 ? (1 + ((Math.floor(state.time * 24) + die.id) % DICE_SIDES)) : die.value;
  const pOff = size * 0.255;
  const pipR = val === 1 ? size * 0.125 : size * 0.092;
  const pipCoords = getDicePipCoords(pOff)[val];

  for (const [ox, oy] of pipCoords) {
    // Subtle recessed pip rim
    ctx.beginPath();
    ctx.arc(ox, oy + 1.5, pipR, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(255,255,255,0.55)';
    ctx.fill();

    ctx.beginPath();
    ctx.arc(ox, oy, pipR, 0, Math.PI * 2);
    ctx.fillStyle = debuffed
      ? '#5C2626'
      : (val === 1 ? COLORS.suitHearts : '#1A2433');
    ctx.fill();
  }

  // Boss debuff cross mark
  if (debuffed && die.tumbleTimer <= 0.05) {
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

  // Small unboxed label under die when selected or debuffed
  if (!isTitle) {
    ctx.save();
    ctx.font = '700 12px ui-monospace, SFMono-Regular, Menlo, monospace';
    ctx.textAlign = 'center';
    if (die.selected) {
      ctx.fillStyle = COLORS.brassBright;
      ctx.fillText('▲ SELECTED', px, die.targetY + 62);
    } else if (debuffed) {
      ctx.fillStyle = COLORS.multLight;
      ctx.fillText('0 CHIPS', px, die.targetY + 62);
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
  const suitColor = getSuitColor(def.suit, isNeg);
  const hw = w / 2;
  const hh = h / 2;
  const r = 9;

  ctx.save();
  ctx.translate(cx, cy - (inst.bounce || 0) * 16 - (hovered && !dragging ? 7 : 0));
  ctx.rotate(tilt + Math.sin(state.time * 2.2 + inst.uid) * (hovered ? 0.018 : 0.008));
  const sc = scale * (1 + (inst.bounce || 0) * 0.1) * (dragging ? 1.07 : 1);
  ctx.scale(sc, sc);

  // Drop shadow
  ctx.save();
  tracePixelRect(ctx, -hw + (dragging ? 10 : 3), -hh + (dragging ? 16 : 8), w, h, r);
  ctx.fillStyle = dragging ? 'rgba(0,0,0,0.55)' : 'rgba(0,0,0,0.38)';
  ctx.fill();
  ctx.restore();

  // Polychrome / Foil / Negative outer aura
  if (isPoly) {
    const hue = (state.time * 95 + inst.uid * 40) % 360;
    ctx.save();
    ctx.shadowColor = `hsl(${hue}, 95%, 68%)`;
    ctx.shadowBlur = 18;
    tracePixelRect(ctx, -hw - 2, -hh - 2, w + 4, h + 4, r + 1);
    ctx.strokeStyle = `hsl(${hue}, 95%, 72%)`;
    ctx.lineWidth = 3;
    ctx.stroke();
    ctx.restore();
  } else if (isFoil) {
    ctx.save();
    ctx.shadowColor = '#60A5FA';
    ctx.shadowBlur = 12;
    tracePixelRect(ctx, -hw - 1.5, -hh - 1.5, w + 3, h + 3, r + 1);
    ctx.strokeStyle = '#93C5FD';
    ctx.lineWidth = 2.5;
    ctx.stroke();
    ctx.restore();
  } else if (isNeg) {
    ctx.save();
    ctx.shadowColor = '#7C3AED';
    ctx.shadowBlur = 14;
    tracePixelRect(ctx, -hw - 1.5, -hh - 1.5, w + 3, h + 3, r + 1);
    ctx.strokeStyle = '#A78BFA';
    ctx.lineWidth = 2.5;
    ctx.stroke();
    ctx.restore();
  }

  // 3D card bottom edge thickness
  tracePixelRect(ctx, -hw, -hh + 4, w, h, r);
  ctx.fillStyle = isNeg ? '#241B42' : '#BEB5A1';
  ctx.fill();

  // Card face background
  tracePixelRect(ctx, -hw, -hh, w, h, r);
  if (isNeg) {
    const ng = ctx.createLinearGradient(-hw, -hh, hw, hh);
    ng.addColorStop(0, '#181E34');
    ng.addColorStop(1, '#0D1020');
    ctx.fillStyle = ng;
  } else {
    const bg = ctx.createLinearGradient(-hw, -hh, hw, hh);
    bg.addColorStop(0, '#FFFDF9');
    bg.addColorStop(1, '#EFE8D8');
    ctx.fillStyle = bg;
  }
  ctx.fill();

  // Inner decorative frame
  tracePixelRect(ctx, -hw + 6, -hh + 6, w - 12, h - 12, 5);
  ctx.strokeStyle = isNeg ? 'rgba(167,139,250,0.28)' : 'rgba(24,34,48,0.12)';
  ctx.lineWidth = 1;
  ctx.stroke();

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
    // Geometric retro crown/medallion
    ctx.save();
    ctx.fillStyle = isNeg ? 'rgba(255,255,255,0.06)' : 'rgba(217,164,65,0.13)';
    tracePixelRect(ctx, -w * 0.28, -h * 0.24, w * 0.56, h * 0.42, 6);
    ctx.fill();
    ctx.strokeStyle = isNeg ? 'rgba(167,139,250,0.38)' : 'rgba(217,164,65,0.5)';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    // Tiny crown pixels above central suit
    ctx.fillStyle = isNeg ? '#FBBF24' : '#C89128';
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
    ctx.strokeStyle = isNeg ? 'rgba(56,189,248,0.35)' : 'rgba(24,34,48,0.14)';
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
    ctx.fillStyle = isNeg ? 'rgba(124, 58, 237, 0.35)' : 'rgba(16, 28, 36, 0.88)';
    ctx.fillRect(-hw + 7, hh - stripH - 7, w - 14, stripH);
    ctx.fillStyle = def.isScaling && inst.scalingBonus > 0 ? COLORS.goldLight : '#F8FAFC';
    ctx.font = `800 ${Math.max(10, Math.round(w * 0.095))}px ui-monospace, SFMono-Regular, Menlo, monospace`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(tagText, 0, hh - stripH / 2 - 6.5);
  }

  // Edition procedural animated sheen clipped to card silhouette
  if (isFoil || isHolo || isPoly) {
    ctx.save();
    tracePixelRect(ctx, -hw, -hh, w, h, r);
    ctx.clip();

    if (isFoil) {
      const sweep = ((state.time * 0.65 + inst.uid * 0.31) % 2.4) - 0.7;
      const gx = -hw + sweep * w * 1.4;
      const fg = ctx.createLinearGradient(gx - 35, -hh, gx + 35, hh);
      fg.addColorStop(0, 'rgba(96, 165, 250, 0)');
      fg.addColorStop(0.42, 'rgba(147, 197, 253, 0.36)');
      fg.addColorStop(0.5, 'rgba(255, 255, 255, 0.58)');
      fg.addColorStop(0.58, 'rgba(96, 165, 250, 0.32)');
      fg.addColorStop(1, 'rgba(96, 165, 250, 0)');
      ctx.fillStyle = fg;
      ctx.fillRect(-hw, -hh, w, h);
    } else if (isHolo) {
      const shift = (state.time * 70 + inst.uid * 55) % 360;
      const hg = ctx.createLinearGradient(-hw, -hh, hw, hh);
      hg.addColorStop(0, `hsla(${(shift) % 360}, 95%, 62%, 0.24)`);
      hg.addColorStop(0.25, `hsla(${(shift + 90) % 360}, 95%, 62%, 0.28)`);
      hg.addColorStop(0.5, `hsla(${(shift + 180) % 360}, 95%, 65%, 0.28)`);
      hg.addColorStop(0.75, `hsla(${(shift + 270) % 360}, 95%, 62%, 0.26)`);
      hg.addColorStop(1, `hsla(${(shift + 350) % 360}, 95%, 62%, 0.22)`);
      ctx.fillStyle = hg;
      ctx.fillRect(-hw, -hh, w, h);
    } else if (isPoly) {
      const shift = (state.time * 110 + inst.uid * 47) % 360;
      const pg = ctx.createLinearGradient(-hw, hh, hw, -hh);
      pg.addColorStop(0, `hsla(${shift}, 100%, 60%, 0.30)`);
      pg.addColorStop(0.35, `hsla(${(shift + 120) % 360}, 100%, 65%, 0.34)`);
      pg.addColorStop(0.7, `hsla(${(shift + 240) % 360}, 100%, 62%, 0.32)`);
      pg.addColorStop(1, `hsla(${(shift + 330) % 360}, 100%, 68%, 0.28)`);
      ctx.fillStyle = pg;
      ctx.fillRect(-hw, -hh, w, h);
      // Prismatic gleam band
      const sweep = ((state.time * 0.9 + inst.uid * 0.4) % 2.2) - 0.6;
      const gx = -hw + sweep * w * 1.4;
      const gl = ctx.createLinearGradient(gx - 22, -hh, gx + 22, hh);
      gl.addColorStop(0, 'rgba(255,255,255,0)');
      gl.addColorStop(0.5, 'rgba(255,255,255,0.45)');
      gl.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.fillStyle = gl;
      ctx.fillRect(-hw, -hh, w, h);
    }
    ctx.restore();
  }

  // Small top-right edition indicator dot/letter (paired with text in tooltip)
  if (inst.edition !== 'standard') {
    const edShort = { foil: 'FOIL', holographic: 'HOLO', polychrome: 'POLY', negative: 'NEG' }[inst.edition];
    ctx.fillStyle = 'rgba(10, 16, 26, 0.85)';
    ctx.fillRect(hw - 42, -hh + 8, 35, 16);
    ctx.fillStyle = EDITIONS[inst.edition].color;
    ctx.font = '800 9.5px ui-monospace, SFMono-Regular, Menlo, monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(edShort, hw - 24.5, -hh + 16.5);
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

  // Crisp outer card stroke
  tracePixelRect(ctx, -hw + 0.5, -hh + 0.5, w - 1, h - 1, r);
  ctx.strokeStyle = hovered ? COLORS.brassBright : (isNeg ? '#A78BFA' : 'rgba(20, 30, 38, 0.55)');
  ctx.lineWidth = hovered ? 2.5 : 1.5;
  ctx.stroke();

  ctx.restore();
}

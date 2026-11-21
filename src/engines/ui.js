import { COLORS } from '../config/colors.js';
import { EDITIONS } from '../config/editions.js';
import { HANDS, HAND_ORDER } from '../config/hands.js';
import { SUIT_SYMBOLS, CARD_BY_ID } from '../config/cards.js';
import {
  clamp,
  tracePixelRect,
  drawBevelPanel,
  drawSuitIcon,
  wrapLines,
  getSuitColor,
  drawDie,
  drawPlayingCard
} from './graphicEngine.js';
import { sfx } from './soundEngine.js';

export function fmtNum(n) {
  return Math.round(n).toLocaleString('en-US');
}

export function fmtMult(n) {
  const r = Math.round(n * 10) / 10;
  return Number.isInteger(r) ? String(r) : r.toFixed(1);
}

export function hitTest(px, py, rect) {
  return rect && px >= rect.x && px <= rect.x + rect.w && py >= rect.y && py <= rect.y + rect.h;
}

// Bottom Art-Deco Arcana Card Dock Layout (Centered across the bottom of the table)
export function getActiveCardLayout(state) {
  const trayX = 160;
  const trayW = 960;
  const count = state.activeCards.length;
  const cardW = count > 6 ? Math.max(88, Math.floor((trayW - (count - 1) * 10) / count)) : 114;
  const cardH = Math.round(cardW * 1.36);
  const gap = count > 6 ? 10 : 18;
  const totalW = count > 0 ? count * cardW + (count - 1) * gap : 0;
  const startX = trayX + (trayW - totalW) / 2;
  const centerY = 656;
  return { cardW, cardH, gap, startX, centerY, trayX, trayW };
}

// Centered Shop Showcase Layout (Middle Arena above the bottom Card Dock)
export function getShopCardRects() {
  const cardW = 132;
  const cardH = 180;
  const gap = 52;
  const totalW = 3 * cardW + 2 * gap;
  const startX = (1280 - totalW) / 2;
  const topY = 230;
  return [0, 1, 2].map(i => ({
    x: startX + i * (cardW + gap),
    y: topY,
    w: cardW,
    h: cardH
  }));
}

export function registerButton(ctx, state, id, x, y, w, h, label, opts = {}) {
  const rect = { x, y, w, h };
  const hovered = !opts.disabled && hitTest(state.mouseX, state.mouseY, rect);
  if (hovered) state.hoverButtonId = id;
  state.buttons.push({ id, rect, onClick: opts.onClick, disabled: !!opts.disabled });

  const {
    fill = COLORS.railPanel,
    hoverFill = '#292042',
    border = COLORS.railBorderBright,
    textColor = COLORS.textMain,
    fontSize = 15,
    sublabel = null,
    lip = 4,
    disabled = false
  } = opts;

  const pressY = hovered ? -1 : 0;
  ctx.save();
  ctx.globalAlpha = disabled ? 0.42 : 1;
  drawBevelPanel(ctx, x, y + pressY, w, h, {
    fill: hovered ? hoverFill : fill,
    border: hovered ? COLORS.brassBright : border,
    lip: disabled ? 2 : lip,
    r: 8,
    glow: hovered && opts.glow ? opts.glow : null
  });

  ctx.fillStyle = textColor;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = `800 ${fontSize}px ui-sans-serif, system-ui, sans-serif`;
  if (sublabel) {
    ctx.fillText(label, x + w / 2, y + pressY + h / 2 - 8);
    ctx.font = '600 11px ui-monospace, SFMono-Regular, Menlo, monospace';
    ctx.fillStyle = 'rgba(248,245,255,0.75)';
    ctx.fillText(sublabel, x + w / 2, y + pressY + h / 2 + 11);
  } else {
    ctx.fillText(label, x + w / 2, y + pressY + h / 2 + 0.5);
  }
  ctx.restore();
}

// Helper to draw pip dots for Throws & Rerolls gauges
function drawPipDots(ctx, cx, y, current, max, activeColor) {
  const dotR = 5.5;
  const gap = 16;
  const totalCount = Math.max(max, current);
  const startX = cx - ((totalCount - 1) * gap) / 2;
  for (let i = 0; i < totalCount; i++) {
    const filled = i < current;
    ctx.beginPath();
    ctx.arc(startX + i * gap, y, dotR, 0, Math.PI * 2);
    ctx.fillStyle = filled ? activeColor : 'rgba(255,255,255,0.12)';
    ctx.fill();
    ctx.strokeStyle = filled ? '#FFFFFF' : COLORS.railBorder;
    ctx.lineWidth = 1;
    ctx.stroke();
  }
}

// ============================================================================
// TOP COMMAND RIBBON & CENTER FORMULA DIAL (Replaces Balatro's Left Sidebar!)
// ============================================================================
export function drawLeftHUD(ctx, state, uiCtx) {
  const { getStageLabel, isDieDebuffedByBoss, MAX_INTEREST } = uiCtx;

  // 1. Top Command Ribbon across the top of the screen
  const rx = 24, ry = 14, rw = 1232, rh = 86;
  drawBevelPanel(ctx, rx, ry, rw, rh, {
    fill: COLORS.railBg,
    border: COLORS.railBorder,
    lip: 4,
    r: 10
  });

  // Left Section: Chapter / Stage Badge & Boss curse
  const isBoss = Boolean(state.activeBoss);
  const blindLabel = getStageLabel(state.stage);
  const stageStr = state.endless ? `ENDLESS ${state.stage}` : `CHAPTER ${state.stage} / 9`;

  drawBevelPanel(ctx, rx + 12, ry + 10, 240, rh - 20, {
    fill: isBoss ? '#2A1020' : COLORS.railPanel,
    border: isBoss ? COLORS.multRed : COLORS.brass,
    lip: 2,
    r: 8
  });

  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';
  ctx.font = '800 11px ui-monospace, SFMono-Regular, Menlo, monospace';
  ctx.fillStyle = isBoss ? COLORS.multLight : COLORS.brassBright;
  ctx.fillText(stageStr + ' · ' + blindLabel, rx + 24, ry + 18);

  if (isBoss) {
    ctx.font = '800 13px ui-sans-serif, system-ui, sans-serif';
    ctx.fillStyle = '#FFE4E6';
    ctx.fillText('☠ ' + state.activeBoss.name, rx + 24, ry + 35);
    ctx.font = '600 11px ui-sans-serif, system-ui, sans-serif';
    ctx.fillStyle = '#FDA4AF';
    ctx.fillText(state.activeBoss.short, rx + 24, ry + 53);
  } else {
    ctx.font = '800 15px ui-sans-serif, system-ui, sans-serif';
    ctx.fillStyle = COLORS.textMain;
    ctx.fillText('Velvet Parlor Table', rx + 24, ry + 36);
    ctx.font = '600 11px ui-sans-serif, system-ui, sans-serif';
    ctx.fillStyle = COLORS.textMuted;
    ctx.fillText('No active table curse', rx + 24, ry + 54);
  }

  // Center-Left Section: Wide Horizontal Score Meter & Goal
  const mx = rx + 266, my = ry + 10, mw = 414, mh = rh - 20;
  drawBevelPanel(ctx, mx, my, mw, mh, {
    fill: '#140F23',
    border: state.stageScore >= state.targetScore ? COLORS.emerald : COLORS.railBorder,
    lip: 2,
    r: 8
  });

  ctx.textAlign = 'left';
  ctx.font = '700 11px ui-monospace, SFMono-Regular, Menlo, monospace';
  ctx.fillStyle = COLORS.textMuted;
  ctx.fillText('STAGE SCORE', mx + 16, my + 10);

  ctx.font = '900 24px ui-monospace, SFMono-Regular, Menlo, monospace';
  ctx.fillStyle = state.stageScore >= state.targetScore ? '#6EE7B7' : COLORS.textMain;
  ctx.fillText(fmtNum(state.displayScore), mx + 16, my + 24);

  ctx.textAlign = 'right';
  ctx.font = '700 11px ui-monospace, SFMono-Regular, Menlo, monospace';
  ctx.fillStyle = COLORS.textMuted;
  ctx.fillText('GOAL TARGET', mx + mw - 16, my + 10);

  ctx.font = '900 24px ui-monospace, SFMono-Regular, Menlo, monospace';
  ctx.fillStyle = COLORS.goldLight;
  ctx.fillText(fmtNum(state.targetScore), mx + mw - 16, my + 24);

  // Horizontal progress bar with diamond marker
  const barX = mx + 16, barY = my + 51, barW = mw - 32, barH = 8;
  ctx.fillStyle = '#090612';
  ctx.fillRect(barX, barY, barW, barH);
  const pct = clamp(state.displayScore / Math.max(1, state.targetScore), 0, 1);
  if (pct > 0) {
    const grad = ctx.createLinearGradient(barX, 0, barX + barW, 0);
    grad.addColorStop(0, COLORS.chipsLight);
    grad.addColorStop(1, pct >= 1 ? COLORS.emerald : COLORS.brassBright);
    ctx.fillStyle = grad;
    ctx.fillRect(barX, barY, barW * pct, barH);
  }
  ctx.strokeStyle = COLORS.railBorderBright;
  ctx.lineWidth = 1;
  ctx.strokeRect(barX + 0.5, barY + 0.5, barW - 1, barH - 1);

  // Center-Right Section: Throws, Shakes & Treasury Bankroll Badges
  const gx = mx + mw + 12;
  // Throws gauge
  drawBevelPanel(ctx, gx, my, 102, mh, {
    fill: COLORS.railPanel, border: COLORS.railBorder, lip: 2, r: 8
  });
  ctx.textAlign = 'center';
  ctx.font = '700 10px ui-monospace, SFMono-Regular, Menlo, monospace';
  ctx.fillStyle = COLORS.textMuted;
  ctx.fillText('HANDS', gx + 51, my + 9);
  ctx.font = '900 20px ui-monospace, SFMono-Regular, Menlo, monospace';
  ctx.fillStyle = state.handsLeft <= 1 ? COLORS.multLight : COLORS.chipsLight;
  ctx.fillText(String(state.handsLeft), gx + 51, my + 23);
  drawPipDots(ctx, gx + 51, my + 52, state.handsLeft, 4, COLORS.chipsLight);

  // Rerolls gauge
  const rx2 = gx + 110;
  drawBevelPanel(ctx, rx2, my, 102, mh, {
    fill: COLORS.railPanel, border: COLORS.railBorder, lip: 2, r: 8
  });
  ctx.font = '700 10px ui-monospace, SFMono-Regular, Menlo, monospace';
  ctx.fillStyle = COLORS.textMuted;
  ctx.fillText('REROLLS', rx2 + 51, my + 9);
  ctx.font = '900 20px ui-monospace, SFMono-Regular, Menlo, monospace';
  ctx.fillStyle = state.rerollsLeft === 0 ? COLORS.textDim : COLORS.brassBright;
  ctx.fillText(String(state.rerollsLeft), rx2 + 51, my + 23);
  drawPipDots(ctx, rx2 + 51, my + 52, state.rerollsLeft, 3, COLORS.brassBright);

  // Treasury / Bankroll
  const bx = rx2 + 110;
  const nextInterest = Math.min(MAX_INTEREST, Math.floor(state.money / 5));
  drawBevelPanel(ctx, bx, my, 134, mh, {
    fill: '#1E1814', border: '#6E5623', lip: 2, r: 8
  });
  ctx.textAlign = 'center';
  ctx.font = '700 10px ui-monospace, SFMono-Regular, Menlo, monospace';
  ctx.fillStyle = COLORS.textMuted;
  ctx.fillText('TREASURY', bx + 67, my + 9);
  ctx.font = '900 22px ui-monospace, SFMono-Regular, Menlo, monospace';
  ctx.fillStyle = COLORS.goldLight;
  ctx.fillText('$' + state.money, bx + 67, my + 23);
  ctx.font = '700 10px ui-monospace, SFMono-Regular, Menlo, monospace';
  ctx.fillStyle = nextInterest > 0 ? '#6EE7B7' : COLORS.textDim;
  ctx.fillText(`+$${nextInterest} interest`, bx + 67, my + 48);

  // Far-Right Section: Compact Utility Toolbar (2x2)
  const ux = bx + 144;
  const uw = 82, uh = 30;
  registerButton(ctx, state, 'hud_guide', ux, my, uw, uh, 'GUIDE', {
    fill: COLORS.railPanel, hoverFill: '#2D224A', fontSize: 11, lip: 2,
    onClick: () => { sfx.click(); state.modal = state.modal === 'GUIDE' ? null : 'GUIDE'; }
  });
  registerButton(ctx, state, 'hud_crt', ux + uw + 8, my, uw, uh, state.crtEnabled ? 'CRT: ON' : 'CRT: OFF', {
    fill: state.crtEnabled ? '#132C28' : COLORS.railPanel,
    hoverFill: '#1D403A',
    border: state.crtEnabled ? COLORS.chipsLight : COLORS.railBorderBright,
    fontSize: 11, lip: 2,
    onClick: () => { sfx.click(); state.crtEnabled = !state.crtEnabled; }
  });
  registerButton(ctx, state, 'hud_sfx', ux, my + 36, uw, uh, sfx.muted ? 'MUTE' : 'AUDIO', {
    fill: COLORS.railPanel, hoverFill: '#2D224A', fontSize: 11, lip: 2,
    onClick: () => { sfx.muted = !sfx.muted; if (!sfx.muted) sfx.click(); }
  });
  registerButton(ctx, state, 'hud_pause', ux + uw + 8, my + 36, uw, uh, 'MENU', {
    fill: COLORS.railPanel, hoverFill: '#2D224A', fontSize: 11, lip: 2,
    onClick: () => { sfx.click(); state.modal = state.modal === 'PAUSE' ? null : 'PAUSE'; }
  });

  // 2. Center Score Formula Dial Bar (Directly beneath Top Ribbon)
  const fx = 250, fy = 110, fw = 780, fh = 58;
  drawBevelPanel(ctx, fx, fy, fw, fh, {
    fill: 'rgba(20, 14, 34, 0.90)',
    border: COLORS.brass,
    lip: 3,
    r: 28
  });

  // Left of Formula: Hand Combo Title & pip preview
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.font = '900 18px ui-sans-serif, system-ui, sans-serif';
  ctx.fillStyle = state.liveHandName ? COLORS.brassBright : COLORS.textDim;
  ctx.fillText(state.liveHandName ? state.liveHandName.toUpperCase() : 'SELECT 1–3 DICE', fx + 26, fy + 21);

  ctx.font = '600 11px ui-monospace, SFMono-Regular, Menlo, monospace';
  if (state.mode === 'SCORING' && state.scoringHandTotal > 0) {
    ctx.fillStyle = COLORS.goldLight;
    ctx.fillText('HAND PAYOUT: +' + fmtNum(state.scoringHandTotal) + ' PTS', fx + 26, fy + 41);
  } else if (state.liveHandName) {
    const sel = state.dice.filter(d => d.selected);
    const pipSum = sel.reduce((a, d) => a + (isDieDebuffedByBoss(d.value) ? 0 : d.value), 0);
    ctx.fillStyle = COLORS.textMuted;
    ctx.fillText(`+${pipSum} die pips added on roll`, fx + 26, fy + 41);
  } else {
    ctx.fillStyle = COLORS.textDim;
    ctx.fillText('Click dice below to preview combo', fx + 26, fy + 41);
  }

  // Right of Formula: Teal Base Pill × Crimson-Flame Multiplier Pill = Projected Total
  const pillY = fy + 10, pillW = 112, pillH = 38;
  const basePillX = fx + 330;

  // Base Points Pill (Teal)
  drawBevelPanel(ctx, basePillX, pillY, pillW, pillH, {
    fill: COLORS.chipsDark,
    border: COLORS.chipsLight,
    lip: 2,
    r: 18
  });
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = '800 10px ui-monospace, SFMono-Regular, Menlo, monospace';
  ctx.fillStyle = COLORS.chipsLight;
  ctx.fillText('BASE', basePillX + 26, pillY + pillH / 2);
  ctx.font = '900 20px ui-monospace, SFMono-Regular, Menlo, monospace';
  ctx.fillStyle = '#FFFFFF';
  ctx.fillText(fmtNum(state.chips), basePillX + 74, pillY + pillH / 2 + 1);

  // Multiply Symbol
  ctx.font = '900 20px ui-sans-serif, system-ui, sans-serif';
  ctx.fillStyle = COLORS.brassBright;
  ctx.fillText('×', basePillX + pillW + 18, pillY + pillH / 2);

  // Mult Pill (Rose/Crimson)
  const multPillX = basePillX + pillW + 36;
  drawBevelPanel(ctx, multPillX, pillY, pillW, pillH, {
    fill: COLORS.multDark,
    border: COLORS.multLight,
    lip: 2,
    r: 18
  });
  ctx.font = '800 10px ui-monospace, SFMono-Regular, Menlo, monospace';
  ctx.fillStyle = COLORS.multLight;
  ctx.fillText('MULT', multPillX + 26, pillY + pillH / 2);
  ctx.font = '900 20px ui-monospace, SFMono-Regular, Menlo, monospace';
  ctx.fillStyle = '#FFFFFF';
  ctx.fillText(fmtMult(state.mult), multPillX + 74, pillY + pillH / 2 + 1);

  // Equals Projected Preview
  const eqX = multPillX + pillW + 20;
  ctx.textAlign = 'left';
  ctx.font = '800 13px ui-monospace, SFMono-Regular, Menlo, monospace';
  ctx.fillStyle = COLORS.textMuted;
  ctx.fillText('=', eqX, pillY + pillH / 2);

  const projTotal = state.mode === 'SCORING' && state.scoringHandTotal > 0
    ? state.scoringHandTotal
    : Math.round(state.chips * state.mult);
  ctx.font = '900 22px ui-monospace, SFMono-Regular, Menlo, monospace';
  ctx.fillStyle = projTotal > 0 ? COLORS.goldLight : COLORS.textDim;
  ctx.fillText(fmtNum(projTotal), eqX + 18, pillY + pillH / 2 + 1);
}

// ============================================================================
// BOTTOM ARCANA CARD DOCK (Replaces Balatro's Top Joker Tray!)
// ============================================================================
export function drawModifierCardTray(ctx, state, uiCtx) {
  const {
    getUsedCardSlots,
    getMaxCardSlots,
    BASE_MAX_SLOTS,
    isCardDebuffedByBoss,
    moveActiveCard,
    sellActiveCard
  } = uiCtx;

  const x = 140, y = 554, w = 1000, h = 192;
  drawBevelPanel(ctx, x, y, w, h, {
    fill: 'rgba(15, 10, 28, 0.86)',
    border: COLORS.railBorderBright,
    lip: 4,
    r: 12
  });

  const usedSlots = getUsedCardSlots();
  const maxSlots = getMaxCardSlots();
  const negBonus = maxSlots - BASE_MAX_SLOTS;

  // Dock Header Bar
  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';
  ctx.font = '800 11.5px ui-monospace, SFMono-Regular, Menlo, monospace';
  ctx.fillStyle = COLORS.brassBright;
  ctx.fillText('♦ ARCANA MODIFIER DOCK', x + 18, y + 10);

  ctx.fillStyle = COLORS.textMuted;
  ctx.font = '700 11.5px ui-monospace, SFMono-Regular, Menlo, monospace';
  const slotLabel = negBonus > 0
    ? `·  ${state.activeCards.length} / ${maxSlots} SLOTS (+${negBonus} Negative)`
    : `·  ${usedSlots} / ${BASE_MAX_SLOTS} SLOTS`;
  ctx.fillText(slotLabel, x + 195, y + 10);

  ctx.textAlign = 'right';
  ctx.font = '600 11px ui-sans-serif, system-ui, sans-serif';
  ctx.fillStyle = COLORS.textMuted;
  ctx.fillText('Triggers Left → Right · Drag or Click Card to Reorder / Sell', x + w - 18, y + 10);

  const layout = getActiveCardLayout(state);
  if (state.activeCards.length === 0) {
    const emptyW = 104, emptyH = 140, gap = 22;
    const tot = 5 * emptyW + 4 * gap;
    const sx = x + (w - tot) / 2;
    for (let i = 0; i < 5; i++) {
      tracePixelRect(ctx, sx + i * (emptyW + gap), y + 36, emptyW, emptyH, 8);
      ctx.strokeStyle = 'rgba(212, 163, 89, 0.14)';
      ctx.lineWidth = 1.5;
      ctx.setLineDash([5, 5]);
      ctx.stroke();
      ctx.setLineDash([]);
    }
    ctx.textAlign = 'center';
    ctx.font = '600 13.5px ui-sans-serif, system-ui, sans-serif';
    ctx.fillStyle = COLORS.textDim;
    ctx.fillText('Clear Chapter 1 to visit the Parlor Shop and draft Arcana Playing Cards', x + w / 2, y + 102);
    return;
  }

  const canManage = (state.mode === 'PLAYING' || state.mode === 'SHOP') && !state.modal;

  state.activeCards.forEach((card, idx) => {
    card.targetX = layout.startX + idx * (layout.cardW + layout.gap) + layout.cardW / 2;
    card.targetY = layout.centerY;
    if (card.x === 0 && card.y === 0) {
      card.x = card.targetX;
      card.y = card.targetY;
    }
  });

  let draggedEntry = null;
  state.activeCards.forEach((card, idx) => {
    const isDragged = state.drag && state.drag.active && state.drag.card === card;
    if (isDragged) {
      draggedEntry = { card, idx };
      return;
    }
    const rect = {
      x: card.x - layout.cardW / 2,
      y: card.y - layout.cardH / 2,
      w: layout.cardW,
      h: layout.cardH
    };
    const isHovered = !state.modal && !state.drag?.active && hitTest(state.mouseX, state.mouseY, rect);
    if (isHovered) {
      state.hoveredCard = { zone: 'active', card, idx, rect };
    }
    const isFocused = state.focusedActiveUid === card.uid;

    drawPlayingCard(ctx, state, card, card.x, card.y, layout.cardW, layout.cardH, {
      debuffed: isCardDebuffedByBoss(idx),
      hovered: isHovered || isFocused
    });

    // Render precision controls (◀ | SELL | ▶) ABOVE the card in the bottom dock
    if (canManage && isFocused) {
      const barY = card.y - layout.cardH / 2 - 32;
      const bw = Math.max(122, layout.cardW + 10);
      const bx = card.x - bw / 2;
      registerButton(ctx, state, `card_left_${card.uid}`, bx, barY, 28, 24, '◀', {
        fill: '#231A38', hoverFill: '#372957', fontSize: 11, lip: 2,
        disabled: idx === 0,
        onClick: () => moveActiveCard(idx, -1)
      });
      registerButton(ctx, state, `card_sell_${card.uid}`, bx + 31, barY, bw - 62, 24, `SELL $${card.sellValue}`, {
        fill: '#69192B', hoverFill: '#96223C', border: '#FB7185', fontSize: 10.5, lip: 2,
        onClick: () => sellActiveCard(idx)
      });
      registerButton(ctx, state, `card_right_${card.uid}`, bx + bw - 28, barY, 28, 24, '▶', {
        fill: '#231A38', hoverFill: '#372957', fontSize: 11, lip: 2,
        disabled: idx === state.activeCards.length - 1,
        onClick: () => moveActiveCard(idx, 1)
      });
    }
  });

  if (draggedEntry) {
    drawPlayingCard(ctx, state, draggedEntry.card, state.drag.curX, state.drag.curY, layout.cardW, layout.cardH, {
      debuffed: isCardDebuffedByBoss(draggedEntry.idx),
      hovered: true,
      dragging: true,
      tilt: clamp((state.drag.curX - draggedEntry.card.x) * 0.004, -0.18, 0.18)
    });
  }
}

// ============================================================================
// CENTER OCTAGONAL VELVET DICE ARENA
// ============================================================================
export function drawPlayArena(ctx, state, uiCtx) {
  const {
    isDieDebuffedByBoss,
    isAnyDieTumbling,
    playSelectedHand,
    triggerReroll,
    clearSelectedDice
  } = uiCtx;

  const cx = 640;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  // Status / Scoring cascade banner
  if (state.mode === 'SCORING' && state.scoringBanner) {
    drawBevelPanel(ctx, cx - 340, 182, 680, 38, {
      fill: 'rgba(22, 15, 38, 0.95)',
      border: COLORS.brassBright,
      lip: 3,
      r: 18
    });
    ctx.font = '800 15px ui-monospace, SFMono-Regular, Menlo, monospace';
    ctx.fillStyle = COLORS.goldLight;
    ctx.fillText(state.scoringBanner, cx, 201);
  } else if (state.noticeTimer > 0 && state.noticeText) {
    drawBevelPanel(ctx, cx - 340, 182, 680, 38, {
      fill: 'rgba(54, 16, 28, 0.95)',
      border: COLORS.multLight,
      lip: 3,
      r: 18
    });
    ctx.font = '700 14px ui-sans-serif, system-ui, sans-serif';
    ctx.fillStyle = '#FECDD3';
    ctx.fillText(state.noticeText, cx, 201);
  } else {
    ctx.font = '600 13px ui-sans-serif, system-ui, sans-serif';
    ctx.fillStyle = COLORS.textMuted;
    ctx.fillText('Select up to 3 dice to lock & score · Reroll tumbles all unlocked dice', cx, 201);
  }

  // Recessed Art-Deco Octagonal Dice Tray in Center of Screen
  tracePixelRect(ctx, 200, 232, 880, 224, 24);
  ctx.fillStyle = 'rgba(8, 4, 16, 0.48)';
  ctx.fill();
  ctx.strokeStyle = 'rgba(212, 163, 89, 0.25)';
  ctx.lineWidth = 2;
  ctx.stroke();

  // Inner brass inlay border
  tracePixelRect(ctx, 208, 240, 864, 208, 18);
  ctx.strokeStyle = 'rgba(212, 163, 89, 0.10)';
  ctx.lineWidth = 1;
  ctx.stroke();

  // Draw all 5 dice centered at Y = 368
  for (const d of state.dice) {
    drawDie(ctx, state, d, false, isDieDebuffedByBoss(d.value));
  }

  // Action Controls Bar centered between Dice Tray and Bottom Card Dock
  const selectedCount = state.dice.filter(d => d.selected).length;
  const unselectedCount = state.dice.length - selectedCount;
  const locked = state.mode !== 'PLAYING' || Boolean(state.modal) || isAnyDieTumbling();
  const minDiceNeeded = (state.activeBoss && state.activeBoss.id === 'MIN_TWO_DICE') ? 2 : 1;

  const btnY = 474;
  registerButton(ctx, state, 'btn_play', 290, btnY, 270, 60, 'SCORE HAND', {
    fill: '#0F766E',
    hoverFill: '#0D9488',
    border: '#5EEAD4',
    fontSize: 18,
    sublabel: selectedCount >= minDiceNeeded ? `${state.liveHandName}  [Space]` : `Select ${minDiceNeeded}–3 Dice`,
    glow: 'rgba(45, 212, 191, 0.35)',
    disabled: locked || selectedCount < minDiceNeeded,
    onClick: playSelectedHand
  });

  const rerollLabel = selectedCount === 0
    ? `REROLL ALL (${state.rerollsLeft})`
    : `REROLL ${unselectedCount} (${state.rerollsLeft})`;
  registerButton(ctx, state, 'btn_reroll', 576, btnY, 270, 60, rerollLabel, {
    fill: '#B45309',
    hoverFill: '#D97706',
    border: '#FCD34D',
    fontSize: 17,
    sublabel: selectedCount > 0 ? `Keep ${selectedCount} locked  [R]` : 'Tumble all 5 dice  [R]',
    glow: 'rgba(252, 211, 77, 0.3)',
    disabled: locked || state.rerollsLeft <= 0 || unselectedCount === 0,
    onClick: triggerReroll
  });

  registerButton(ctx, state, 'btn_clear', 862, btnY, 128, 60, 'UNLOCK', {
    fill: COLORS.railPanel,
    hoverFill: '#2E234A',
    border: COLORS.railBorderBright,
    fontSize: 14,
    sublabel: 'Clear [C]',
    disabled: locked || selectedCount === 0,
    onClick: clearSelectedDice
  });
}

export function drawCashOutPanel(ctx, state, uiCtx) {
  const { getStageLabel, claimCashOut } = uiCtx;
  const d = state.cashOutData;
  if (!d) return;
  const w = 600, h = 344;
  const x = (1280 - w) / 2, y = 186;
  drawBevelPanel(ctx, x, y, w, h, {
    fill: '#140E24',
    border: COLORS.brassBright,
    lip: 6,
    r: 14,
    glow: 'rgba(245, 205, 121, 0.25)'
  });

  ctx.textAlign = 'center';
  ctx.textBaseline = 'top';
  ctx.font = '900 26px ui-sans-serif, system-ui, sans-serif';
  ctx.fillStyle = '#5EEAD4';
  ctx.fillText(d.isRunVictory ? 'CHAPTER 9 BOSS CONQUERED!' : `CHAPTER ${state.stage} CLEARED!`, x + w / 2, y + 22);

  ctx.font = '600 13px ui-monospace, SFMono-Regular, Menlo, monospace';
  ctx.fillStyle = COLORS.textMuted;
  ctx.fillText(`Score ${fmtNum(state.stageScore)}  /  Goal ${fmtNum(state.targetScore)}`, x + w / 2, y + 56);

  const rows = [
    { label: `${getStageLabel(state.stage)} Clear Bounty`, val: `+$${d.baseReward}`, show: state.cashOutReveal >= 0.15 },
    { label: `Unused Hands (${d.handsCount} × $1)`, val: `+$${d.handsBonus}`, show: state.cashOutReveal >= 0.45 },
    { label: `Treasury Interest ($1 per $5 held, max $5)`, val: `+$${d.interest}`, show: state.cashOutReveal >= 0.75 }
  ];

  let ry = y + 96;
  for (const row of rows) {
    if (row.show) {
      ctx.textAlign = 'left';
      ctx.font = '600 15px ui-sans-serif, system-ui, sans-serif';
      ctx.fillStyle = COLORS.textMain;
      ctx.fillText(row.label, x + 48, ry);
      ctx.textAlign = 'right';
      ctx.font = '800 18px ui-monospace, SFMono-Regular, Menlo, monospace';
      ctx.fillStyle = COLORS.goldLight;
      ctx.fillText(row.val, x + w - 48, ry - 2);
    }
    ry += 38;
  }

  ctx.strokeStyle = COLORS.railBorderBright;
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(x + 48, ry + 4);
  ctx.lineTo(x + w - 48, ry + 4);
  ctx.stroke();

  ctx.textAlign = 'left';
  ctx.font = '800 17px ui-sans-serif, system-ui, sans-serif';
  ctx.fillStyle = COLORS.textMain;
  ctx.fillText('TOTAL PAYOUT', x + 48, ry + 18);
  ctx.textAlign = 'right';
  ctx.font = '900 26px ui-monospace, SFMono-Regular, Menlo, monospace';
  ctx.fillStyle = COLORS.goldLight;
  ctx.fillText(`+$${d.total}`, x + w - 48, ry + 13);

  registerButton(ctx, state, 'btn_cashout', x + 120, y + h - 72, w - 240, 52,
    d.isRunVictory ? 'CLAIM VICTORY' : 'COLLECT & VISIT SHOP', {
      fill: '#D97706',
      hoverFill: '#F59E0B',
      border: '#FDE047',
      textColor: '#0E0A18',
      fontSize: 17,
      sublabel: '[Space / Enter]',
      glow: 'rgba(253, 224, 71, 0.35)',
      onClick: claimCashOut
    });
}

export function drawShopArena(ctx, state, uiCtx) {
  const {
    getStageLabel,
    getStageTarget,
    getMaxCardSlots,
    buyShopCard,
    rerollShop,
    startStage,
    SHOP_REROLL_COST
  } = uiCtx;

  const w = 960, h = 362;
  const x = (1280 - w) / 2, y = 178;
  drawBevelPanel(ctx, x, y, w, h, {
    fill: 'rgba(18, 12, 32, 0.92)',
    border: COLORS.brass,
    lip: 5,
    r: 14
  });

  // Shop Header
  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';
  ctx.font = '900 22px ui-sans-serif, system-ui, sans-serif';
  ctx.fillStyle = COLORS.brassBright;
  ctx.fillText('♦ ARCANA PARLOR BAZAAR', x + 26, y + 16);

  const nextStage = state.stage + 1;
  const nextIsBoss = nextStage % 3 === 0;
  ctx.textAlign = 'right';
  ctx.font = '700 12.5px ui-monospace, SFMono-Regular, Menlo, monospace';
  ctx.fillStyle = nextIsBoss ? COLORS.multLight : COLORS.textMuted;
  ctx.fillText(
    `Up Next: Chapter ${nextStage} (${getStageLabel(nextStage)}) · Goal ${fmtNum(getStageTarget(nextStage))}`,
    x + w - 26,
    y + 20
  );

  // 3 Showcase Cards on Left/Center + Action Column on Right
  const rects = getShopCardRects();
  const slotsFull = state.activeCards.length >= getMaxCardSlots();

  rects.forEach((r, idx) => {
    // Shift shop cards slightly left to make room for bazaar action controls on right
    const cardRect = { x: r.x - 120, y: r.y, w: r.w, h: r.h };
    const card = state.shopCards[idx];

    tracePixelRect(ctx, cardRect.x - 12, cardRect.y - 10, cardRect.w + 24, cardRect.h + 68, 10);
    ctx.fillStyle = 'rgba(9, 6, 18, 0.68)';
    ctx.fill();
    ctx.strokeStyle = 'rgba(212, 163, 89, 0.16)';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    if (!card) {
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.font = '800 14px ui-monospace, SFMono-Regular, Menlo, monospace';
      ctx.fillStyle = COLORS.textDim;
      ctx.fillText('ACQUIRED', cardRect.x + cardRect.w / 2, cardRect.y + cardRect.h / 2);
      return;
    }

    const hovered = !state.modal && hitTest(state.mouseX, state.mouseY, cardRect);
    if (hovered) {
      state.hoveredCard = { zone: 'shop', card, idx, rect: cardRect };
    }

    drawPlayingCard(ctx, state, card, cardRect.x + cardRect.w / 2, cardRect.y + cardRect.h / 2, cardRect.w, cardRect.h, {
      hovered
    });

    const isNeg = card.edition === 'negative';
    const canAfford = state.money >= card.price;
    const canFit = isNeg || !slotsFull;
    const buyDisabled = !canAfford || !canFit || Boolean(state.modal);
    let buyLabel = `DRAFT $${card.price}`;
    if (!canFit) buyLabel = 'DOCK FULL';
    else if (isNeg) buyLabel = `DRAFT $${card.price} (+1)`;

    registerButton(ctx, state, `shop_buy_${idx}`, cardRect.x - 2, cardRect.y + cardRect.h + 12, cardRect.w + 4, 36, buyLabel, {
      fill: buyDisabled ? '#1B162A' : '#0F766E',
      hoverFill: '#0D9488',
      border: buyDisabled ? COLORS.railBorder : '#5EEAD4',
      fontSize: 13,
      disabled: buyDisabled,
      onClick: () => buyShopCard(idx)
    });
  });

  // Right Column inside Shop Panel: Reroll & Next Chapter Buttons
  const sideX = x + w - 256;
  registerButton(ctx, state, 'shop_reroll', sideX, y + 84, 226, 64, `REFRESH BAZAAR ($${SHOP_REROLL_COST})`, {
    fill: '#B45309',
    hoverFill: '#D97706',
    border: '#FCD34D',
    fontSize: 15,
    sublabel: 'Roll 3 new cards  [R]',
    disabled: state.money < SHOP_REROLL_COST || Boolean(state.modal),
    onClick: rerollShop
  });

  registerButton(ctx, state, 'shop_next', sideX, y + 168, 226, 72, `NEXT CHAPTER (${nextStage}) ▸`, {
    fill: '#6D28D9',
    hoverFill: '#7C3AED',
    border: '#C4B5FD',
    fontSize: 16,
    sublabel: `${getStageLabel(nextStage)}  [Space]`,
    glow: 'rgba(167, 139, 250, 0.35)',
    disabled: Boolean(state.modal),
    onClick: () => startStage(nextStage)
  });

  // Notice or tip at bottom of shop right column
  ctx.textAlign = 'center';
  ctx.font = '600 11.5px ui-sans-serif, system-ui, sans-serif';
  if (state.noticeTimer > 0 && state.noticeText) {
    ctx.fillStyle = '#FDA4AF';
    ctx.fillText(state.noticeText, sideX + 113, y + 275);
  } else {
    ctx.fillStyle = COLORS.textMuted;
    ctx.fillText('Hold $5 increments for', sideX + 113, y + 266);
    ctx.fillText('up to +$5 Interest per stage', sideX + 113, y + 284);
  }
}

export function drawCardTooltip(ctx, state, uiCtx) {
  if (!state.hoveredCard || state.modal || (state.drag && state.drag.active)) return;
  const { isCardDebuffedByBoss, LOGICAL_W, LOGICAL_H } = uiCtx;
  const { zone, card, idx, rect } = state.hoveredCard;
  const def = CARD_BY_ID[card.cardId];
  const ed = EDITIONS[card.edition];
  const debuffed = zone === 'active' && isCardDebuffedByBoss(idx);

  const tipW = 286;
  ctx.font = '600 13px ui-sans-serif, system-ui, sans-serif';
  const descLines = wrapLines(ctx, def.desc, tipW - 28);
  let tipH = 66 + descLines.length * 18;
  if (ed.bonusText) tipH += 26;
  if (def.isScaling) tipH += 22;
  if (debuffed) tipH += 24;
  tipH += 24;

  let tx = rect.x + rect.w / 2 - tipW / 2;
  tx = clamp(tx, 24, LOGICAL_W - tipW - 24);
  // Active cards are in the bottom dock -> position tooltip ABOVE the card
  let ty = zone === 'active' ? rect.y - tipH - 38 : rect.y - tipH - 14;
  if (ty < 14) ty = rect.y + rect.h + 16;
  if (ty + tipH > LOGICAL_H - 14) ty = LOGICAL_H - tipH - 14;

  drawBevelPanel(ctx, tx, ty, tipW, tipH, {
    fill: 'rgba(14, 10, 26, 0.97)',
    border: card.edition !== 'standard' ? ed.color : COLORS.brassBright,
    lip: 4,
    r: 10,
    glow: 'rgba(0,0,0,0.65)'
  });

  let curY = ty + 14;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';
  ctx.font = '800 15px ui-sans-serif, system-ui, sans-serif';
  ctx.fillStyle = COLORS.textMain;
  ctx.fillText(def.name, tx + 14, curY);

  ctx.textAlign = 'right';
  ctx.font = '800 14px ui-monospace, SFMono-Regular, Menlo, monospace';
  ctx.fillStyle = getSuitColor(def.suit, card.edition === 'negative');
  ctx.fillText(def.rank + SUIT_SYMBOLS[def.suit], tx + tipW - 14, curY);

  curY += 22;
  ctx.textAlign = 'left';
  ctx.font = '700 11px ui-monospace, SFMono-Regular, Menlo, monospace';
  ctx.fillStyle = ed.color;
  ctx.fillText(ed.name.toUpperCase() + ' EDITION  ·  ' + def.rarity.toUpperCase(), tx + 14, curY);

  curY += 20;
  ctx.font = '600 13px ui-sans-serif, system-ui, sans-serif';
  ctx.fillStyle = '#EDE9FE';
  for (const line of descLines) {
    ctx.fillText(line, tx + 14, curY);
    curY += 18;
  }

  if (def.isScaling) {
    curY += 4;
    ctx.font = '800 12px ui-monospace, SFMono-Regular, Menlo, monospace';
    ctx.fillStyle = COLORS.goldLight;
    ctx.fillText(`Current Bonus: +${card.scalingBonus || 0} Mult`, tx + 14, curY);
    curY += 18;
  }

  if (ed.bonusText) {
    curY += 6;
    ctx.font = '700 12px ui-sans-serif, system-ui, sans-serif';
    ctx.fillStyle = ed.color;
    ctx.fillText(`${ed.name}: ${ed.bonusText}`, tx + 14, curY);
    curY += 20;
  }

  if (debuffed) {
    curY += 4;
    ctx.font = '800 12px ui-sans-serif, system-ui, sans-serif';
    ctx.fillStyle = COLORS.multLight;
    ctx.fillText('DISABLED BY CURSE (Drag right to restore)', tx + 14, curY);
    curY += 20;
  }

  curY += 6;
  ctx.font = '600 11px ui-monospace, SFMono-Regular, Menlo, monospace';
  ctx.fillStyle = COLORS.textMuted;
  if (zone === 'active') {
    ctx.fillText(`Sell Value: $${card.sellValue} · Click card for controls`, tx + 14, curY);
  } else {
    ctx.fillText(`Bazaar Price: $${card.price} · Sell Value: $${card.sellValue}`, tx + 14, curY);
  }
}

export function drawTitleScreen(ctx, state, uiCtx) {
  const { startNewRun, LOGICAL_W } = uiCtx;

  for (const td of state.titleDice) {
    const bob = Math.sin(state.time * 1.6 + td.phase) * 10;
    drawDie(ctx, state, {
      id: 0,
      value: td.value,
      x: td.x,
      y: td.y + bob,
      targetY: td.y + 18,
      angle: td.rot + Math.sin(state.time * 0.9 + td.phase) * 0.06,
      tumbleTimer: 0,
      scale: 1,
      hop: 0,
      flash: 0
    }, true, false);
  }

  const fanCx = LOGICAL_W / 2;
  const fanCy = 468;
  state.titleCards.forEach((c, i) => {
    const offset = i - 2;
    const angle = offset * 0.14 + Math.sin(state.time * 1.1 + i) * 0.015;
    const cx = fanCx + offset * 92;
    const cy = fanCy + Math.abs(offset) * 16 + Math.sin(state.time * 1.8 + i * 0.7) * 5;
    drawPlayingCard(ctx, state, c, cx, cy, 114, 156, { tilt: angle });
  });

  const titleY = 178;
  ctx.save();
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  drawSuitIcon(ctx, 'spades', fanCx - 235, titleY - 56, 11, COLORS.brass);
  drawSuitIcon(ctx, 'hearts', fanCx - 207, titleY - 56, 11, COLORS.suitHearts);
  drawSuitIcon(ctx, 'diamonds', fanCx + 207, titleY - 56, 11, COLORS.suitDiamonds);
  drawSuitIcon(ctx, 'clubs', fanCx + 235, titleY - 56, 11, COLORS.chipsLight);

  ctx.font = '800 13px ui-monospace, SFMono-Regular, Menlo, monospace';
  ctx.fillStyle = COLORS.brassBright;
  ctx.fillText('ART-DECO DICE & ARCANA PARLOR ROGUELIKE', fanCx, titleY - 56);

  ctx.font = '900 84px ui-sans-serif, system-ui, sans-serif';
  ctx.fillStyle = '#070310';
  ctx.fillText('VELVET ROLL', fanCx + 5, titleY + 7);
  ctx.fillStyle = COLORS.brass;
  ctx.fillText('VELVET ROLL', fanCx + 2, titleY + 3);
  ctx.shadowColor = 'rgba(245, 205, 121, 0.35)';
  ctx.shadowBlur = 24;
  ctx.fillStyle = '#FAF6EE';
  ctx.fillText('VELVET ROLL', fanCx, titleY);
  ctx.restore();

  ctx.textAlign = 'center';
  ctx.font = '600 16px ui-sans-serif, system-ui, sans-serif';
  ctx.fillStyle = COLORS.textMuted;
  ctx.fillText('Sculpt 3-dice combos · Dock 18 Arcana cards across 5 editions · Conquer 9 chapters + Endless', fanCx, 250);

  registerButton(ctx, state, 'title_play', fanCx - 140, 286, 280, 62, 'ENTER PARLOR', {
    fill: '#0F766E',
    hoverFill: '#0D9488',
    border: '#5EEAD4',
    fontSize: 22,
    sublabel: 'Press Enter or Space',
    glow: 'rgba(45, 212, 191, 0.4)',
    onClick: startNewRun
  });

  registerButton(ctx, state, 'title_guide', fanCx - 175, 594, 165, 42, 'HANDS & RULES', {
    fill: COLORS.railPanel, hoverFill: '#2D224A', fontSize: 13,
    onClick: () => { sfx.click(); state.modal = 'GUIDE'; }
  });
  registerButton(ctx, state, 'title_crt', fanCx + 10, 594, 165, 42, state.crtEnabled ? 'CRT GLOW: ON' : 'CRT GLOW: OFF', {
    fill: COLORS.railPanel, hoverFill: '#2D224A', fontSize: 13,
    onClick: () => { sfx.click(); state.crtEnabled = !state.crtEnabled; }
  });

  if (state.stats.bestHand > 0 || state.stats.wins > 0) {
    ctx.font = '700 13px ui-monospace, SFMono-Regular, Menlo, monospace';
    ctx.fillStyle = COLORS.brassBright;
    ctx.fillText(
      `Best Hand: ${fmtNum(state.stats.bestHand)}   ·   Best Chapter: ${state.stats.bestStage}   ·   Runs Won: ${state.stats.wins}`,
      fanCx,
      664
    );
  }

  ctx.font = '600 12.5px ui-monospace, SFMono-Regular, Menlo, monospace';
  ctx.fillStyle = COLORS.textDim;
  ctx.fillText('Click Dice (1–5) · Space Score Hand · R Reroll · Drag Dock Cards to Reorder · Esc Pause', fanCx, 718);
}

export function drawEndModal(ctx, state, isVictory, uiCtx) {
  const { startNewRun, enterShop, LOGICAL_W, LOGICAL_H } = uiCtx;

  state.buttons = [];
  state.hoverButtonId = null;
  state.hoveredCard = null;
  ctx.fillStyle = 'rgba(7, 3, 16, 0.82)';
  ctx.fillRect(0, 0, LOGICAL_W, LOGICAL_H);

  const w = 560, h = 420;
  const x = (LOGICAL_W - w) / 2;
  const y = (LOGICAL_H - h) / 2;
  drawBevelPanel(ctx, x, y, w, h, {
    fill: '#140E24',
    border: isVictory ? COLORS.brassBright : COLORS.multRed,
    lip: 6,
    r: 14,
    glow: isVictory ? 'rgba(245, 205, 121, 0.3)' : 'rgba(225, 29, 72, 0.3)'
  });

  ctx.textAlign = 'center';
  ctx.textBaseline = 'top';
  ctx.font = '900 36px ui-sans-serif, system-ui, sans-serif';
  ctx.fillStyle = isVictory ? COLORS.goldLight : COLORS.multLight;
  ctx.fillText(isVictory ? 'PARLOR CHAMPION!' : 'OUT OF HANDS', x + w / 2, y + 32);

  ctx.font = '600 15px ui-sans-serif, system-ui, sans-serif';
  ctx.fillStyle = COLORS.textMuted;
  ctx.fillText(
    isVictory
      ? 'You conquered all 9 chapters and 3 Boss Curses!'
      : `Fell short at Chapter ${state.stage} (${fmtNum(state.stageScore)} / ${fmtNum(state.targetScore)})`,
    x + w / 2,
    y + 82
  );

  const rows = [
    ['Chapter Reached', state.endless ? `Endless ${state.stage}` : `${state.stage} / 9`],
    ['Best Single Hand', fmtNum(state.bestHandScore)],
    ['Hands Scored', String(state.handsPlayedRun)],
    ['Total Gold Earned', '$' + state.totalMoneyEarned],
    ['Docked Arcana Cards', String(state.activeCards.length)]
  ];

  let ry = y + 132;
  for (const [k, v] of rows) {
    ctx.textAlign = 'left';
    ctx.font = '600 14px ui-sans-serif, system-ui, sans-serif';
    ctx.fillStyle = COLORS.textMuted;
    ctx.fillText(k, x + 64, ry);
    ctx.textAlign = 'right';
    ctx.font = '800 16px ui-monospace, SFMono-Regular, Menlo, monospace';
    ctx.fillStyle = COLORS.textMain;
    ctx.fillText(v, x + w - 64, ry - 1);
    ry += 32;
  }

  if (isVictory) {
    registerButton(ctx, state, 'end_endless', x + 44, y + h - 84, 228, 54, 'CONTINUE ENDLESS', {
      fill: '#6D28D9', hoverFill: '#7C3AED', border: '#C4B5FD', fontSize: 15,
      onClick: () => {
        sfx.buyCard();
        state.endless = true;
        enterShop();
      }
    });
    registerButton(ctx, state, 'end_new', x + w - 272, y + h - 84, 228, 54, 'NEW RUN', {
      fill: '#0F766E', hoverFill: '#0D9488', border: '#5EEAD4', fontSize: 16,
      onClick: startNewRun
    });
  } else {
    registerButton(ctx, state, 'end_retry', x + 70, y + h - 84, 200, 54, 'PLAY AGAIN', {
      fill: '#0F766E', hoverFill: '#0D9488', border: '#5EEAD4', fontSize: 16,
      onClick: startNewRun
    });
    registerButton(ctx, state, 'end_title', x + w - 270, y + h - 84, 200, 54, 'TITLE SCREEN', {
      fill: COLORS.railPanel, hoverFill: '#2D224A', fontSize: 15,
      onClick: () => { sfx.click(); state.mode = 'TITLE_MENU'; state.modal = null; }
    });
  }
}

export function drawOverlayModal(ctx, state, uiCtx) {
  if (!state.modal) return;
  const { startNewRun, LOGICAL_W, LOGICAL_H } = uiCtx;

  state.buttons = [];
  state.hoverButtonId = null;
  state.hoveredCard = null;
  ctx.fillStyle = 'rgba(7, 3, 16, 0.82)';
  ctx.fillRect(0, 0, LOGICAL_W, LOGICAL_H);

  if (state.modal === 'PAUSE') {
    const w = 420, h = 330;
    const x = (LOGICAL_W - w) / 2, y = (LOGICAL_H - h) / 2;
    drawBevelPanel(ctx, x, y, w, h, {
      fill: '#140E24', border: COLORS.brassBright, lip: 6, r: 14
    });
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    ctx.font = '900 26px ui-sans-serif, system-ui, sans-serif';
    ctx.fillStyle = COLORS.textMain;
    ctx.fillText('PAUSED', x + w / 2, y + 28);

    registerButton(ctx, state, 'pause_resume', x + 60, y + 88, w - 120, 48, 'RESUME RUN', {
      fill: '#0F766E', hoverFill: '#0D9488', border: '#5EEAD4', fontSize: 16,
      onClick: () => { sfx.click(); state.modal = null; }
    });
    registerButton(ctx, state, 'pause_restart', x + 60, y + 150, w - 120, 48, 'RESTART RUN', {
      fill: '#B45309', hoverFill: '#D97706', border: '#FCD34D', fontSize: 15,
      onClick: startNewRun
    });
    registerButton(ctx, state, 'pause_title', x + 60, y + 212, w - 120, 48, 'EXIT TO TITLE', {
      fill: COLORS.railPanel, hoverFill: '#2D224A', fontSize: 15,
      onClick: () => { sfx.click(); state.modal = null; state.mode = 'TITLE_MENU'; }
    });
    return;
  }

  if (state.modal === 'GUIDE') {
    const w = 820, h = 580;
    const x = (LOGICAL_W - w) / 2, y = (LOGICAL_H - h) / 2;
    drawBevelPanel(ctx, x, y, w, h, {
      fill: '#140E24', border: COLORS.brassBright, lip: 6, r: 14
    });

    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    ctx.font = '900 24px ui-sans-serif, system-ui, sans-serif';
    ctx.fillStyle = COLORS.brassBright;
    ctx.fillText('SCORING HANDS & ARCANA EDITIONS', x + 32, y + 24);

    registerButton(ctx, state, 'guide_close', x + w - 124, y + 20, 92, 36, 'CLOSE', {
      fill: COLORS.railPanel, hoverFill: '#2D224A', fontSize: 13,
      onClick: () => { sfx.click(); state.modal = null; }
    });

    ctx.font = '800 13px ui-monospace, SFMono-Regular, Menlo, monospace';
    ctx.fillStyle = COLORS.textMuted;
    ctx.fillText('3-DICE HANDS (Each scored die adds its pips to Base Points)', x + 32, y + 72);

    let hy = y + 100;
    for (const hid of HAND_ORDER.slice().reverse()) {
      const hd = HANDS[hid];
      drawBevelPanel(ctx, x + 32, hy, 420, 56, {
        fill: COLORS.railPanel, border: COLORS.railBorder, lip: 2, r: 8
      });
      ctx.textAlign = 'left';
      ctx.font = '800 15px ui-sans-serif, system-ui, sans-serif';
      ctx.fillStyle = COLORS.textMain;
      ctx.fillText(hd.name, x + 46, hy + 10);
      ctx.font = '600 12px ui-sans-serif, system-ui, sans-serif';
      ctx.fillStyle = COLORS.textMuted;
      ctx.fillText(hd.desc, x + 46, hy + 31);

      ctx.textAlign = 'right';
      ctx.font = '800 15px ui-monospace, SFMono-Regular, Menlo, monospace';
      ctx.fillStyle = COLORS.chipsLight;
      ctx.fillText(`${hd.chips}`, x + 378, hy + 20);
      ctx.fillStyle = COLORS.textMuted;
      ctx.fillText('×', x + 396, hy + 20);
      ctx.fillStyle = COLORS.multLight;
      ctx.fillText(`${hd.mult}`, x + 436, hy + 20);
      hy += 66;
    }

    const rx = x + 480;
    ctx.textAlign = 'left';
    ctx.font = '800 13px ui-monospace, SFMono-Regular, Menlo, monospace';
    ctx.fillStyle = COLORS.textMuted;
    ctx.fillText('CARD EDITIONS (Rolled in Bazaar)', rx, y + 72);

    const edList = [
      ['Standard (80%)', 'Normal card behavior', '#CBD5E1'],
      ['Foil (8%)', '+50 Base Points when triggered', '#2DD4BF'],
      ['Holographic (7%)', '+12 Mult when triggered', '#F472B6'],
      ['Polychrome (3%)', 'x1.5 Mult when triggered', '#C084FC'],
      ['Negative (2%)', '+1 Max Dock Slot (0 space)', '#38BDF8']
    ];
    let ey = y + 102;
    for (const [name, txt, col] of edList) {
      ctx.font = '800 14px ui-sans-serif, system-ui, sans-serif';
      ctx.fillStyle = col;
      ctx.fillText(name, rx, ey);
      ctx.font = '600 12.5px ui-sans-serif, system-ui, sans-serif';
      ctx.fillStyle = '#DDD6FE';
      ctx.fillText(txt, rx, ey + 19);
      ey += 48;
    }

    drawBevelPanel(ctx, rx, ey + 10, 308, 134, {
      fill: '#18122B', border: COLORS.railBorderBright, lip: 2, r: 8
    });
    ctx.font = '800 12.5px ui-monospace, SFMono-Regular, Menlo, monospace';
    ctx.fillStyle = COLORS.brassBright;
    ctx.fillText('PARLOR STRATEGY TIPS', rx + 14, ey + 24);
    ctx.font = '600 12px ui-sans-serif, system-ui, sans-serif';
    ctx.fillStyle = '#EDE9FE';
    const tips = [
      '• Place +Mult cards LEFT of xMult cards.',
      '• Keep $25 in Treasury for max +$5 Interest.',
      '• Reroll keeps selected dice locked.',
      '• Every 3rd chapter has a Boss Curse.'
    ];
    tips.forEach((t, i) => ctx.fillText(t, rx + 14, ey + 48 + i * 21));

    ctx.textAlign = 'center';
    ctx.font = '600 12px ui-monospace, SFMono-Regular, Menlo, monospace';
    ctx.fillStyle = COLORS.textMuted;
    ctx.fillText('Shortcuts: Keys 1–5 Toggle Dice · Space Score · R Reroll · C Unlock · Esc Close', x + w / 2, y + h - 32);
  }
}

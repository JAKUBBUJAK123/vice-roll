import { COLORS } from '../config/colors.js';
import { EDITIONS } from '../config/editions.js';
import { HANDS, HAND_ORDER } from '../config/hands.js';
import { SUIT_SYMBOLS, CARD_BY_ID } from '../config/cards.js';
import { TICKET_COST, TICKET_BY_ID } from '../config/tickets.js';
import { DICE_SIDES, FACE_MOD_META } from '../config/dices.js';
import { POTION_BY_ID, MAX_POTION_SLOTS } from '../config/potions.js';
import { ARTEFACT_BY_ID } from '../config/artefacts.js';
import { CLOTH_CATALOG, CLOTH_BY_ID, DIFFICULTY_CATALOG, DIFFICULTY_BY_ID } from '../config/cloths.js';
import {
  clamp,
  tracePixelRect,
  traceTicketRect,
  drawBevelPanel,
  drawSuitIcon,
  drawGemstoneIcon,
  drawPotionIcon,
  drawArtefactIcon,
  drawTicketIcon,
  drawClothSwatch,
  drawDifficultyIcon,
  wrapLines,
  getSuitColor,
  drawDie,
  drawDieFaceMini,
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
  const trayX = 200;
  const trayW = 880;
  const count = state.activeCards.length;
  const cardW = count > 6 ? Math.max(84, Math.floor((trayW - (count - 1) * 10) / count)) : 112;
  const cardH = Math.round(cardW * 1.36);
  const gap = count > 6 ? 10 : 16;
  const totalW = count > 0 ? count * cardW + (count - 1) * gap : 0;
  const startX = trayX + (trayW - totalW) / 2;
  const centerY = 656;
  return { cardW, cardH, gap, startX, centerY, trayX, trayW };
}

// Dynamic Shop Card Showcase Rects (supports 3 or 4 cards via VIP Pass Ticket)
export function getShopCardRects(cardCount = 3) {
  const zoneX = 246;
  const zoneW = 550;
  const cardW = cardCount >= 4 ? 112 : 130;
  const cardH = Math.round(cardW * 1.36);
  const gap = cardCount >= 4 ? 18 : 34;
  const totalW = cardCount * cardW + (cardCount - 1) * gap;
  const startX = zoneX + (zoneW - totalW) / 2;
  const topY = 238;
  return Array.from({ length: cardCount }, (_, i) => ({
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
  if (opts.drawInvisible) return;

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
    ctx.font = '600 10.5px ui-monospace, SFMono-Regular, Menlo, monospace';
    ctx.fillStyle = 'rgba(248,245,255,0.75)';
    ctx.fillText(sublabel, x + w / 2, y + pressY + h / 2 + 10);
  } else {
    ctx.fillText(label, x + w / 2, y + pressY + h / 2 + 0.5);
  }
  ctx.restore();
}

function drawPipDots(ctx, cx, y, current, max, activeColor) {
  const totalCount = Math.max(max, current);
  const dotR = totalCount > 5 ? 4.5 : 5.5;
  const gap = totalCount > 5 ? 12 : 15;
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
// TOP COMMAND RIBBON & CENTER FORMULA DIAL
// ============================================================================
export function drawLeftHUD(ctx, state, uiCtx) {
  const {
    getStageLabel,
    isDieDebuffedByBoss,
    getMaxSelectDice,
    getStageMaxHands,
    getStageMaxRerolls,
    MAX_INTEREST
  } = uiCtx;

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
  ctx.fillText(stageStr + ' · ' + blindLabel, rx + 24, ry + 17);

  if (isBoss) {
    ctx.font = '800 13px ui-sans-serif, system-ui, sans-serif';
    ctx.fillStyle = '#FFE4E6';
    ctx.fillText('☠ ' + state.activeBoss.name, rx + 24, ry + 34);
    ctx.font = '600 11px ui-sans-serif, system-ui, sans-serif';
    ctx.fillStyle = '#FDA4AF';
    ctx.fillText(state.activeBoss.short, rx + 24, ry + 52);
  } else {
    const ticketCount = Object.values(state.tickets || {}).reduce((a, b) => a + b, 0);
    ctx.font = '800 14.5px ui-sans-serif, system-ui, sans-serif';
    ctx.fillStyle = COLORS.textMain;
    ctx.fillText('Velvet Parlor Table', rx + 24, ry + 34);
    ctx.font = '600 11px ui-monospace, SFMono-Regular, Menlo, monospace';
    ctx.fillStyle = ticketCount > 0 ? COLORS.chipsLight : COLORS.textMuted;
    ctx.fillText(
      ticketCount > 0
        ? `${state.dicePool.length}d Pool · Max ${getMaxSelectDice()} Combo · ${ticketCount} Ticket${ticketCount > 1 ? 's' : ''}`
        : `${state.dicePool.length}d Pool · Max ${getMaxSelectDice()} Combo`,
      rx + 24,
      ry + 53
    );
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

  // Horizontal progress bar
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

  // Center-Right Section: Hands, Rerolls & Treasury Bankroll Badges
  const gx = mx + mw + 12;
  const maxHands = getStageMaxHands();
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
  drawPipDots(ctx, gx + 51, my + 52, state.handsLeft, maxHands, COLORS.chipsLight);

  const rx2 = gx + 110;
  const maxRerolls = getStageMaxRerolls();
  drawBevelPanel(ctx, rx2, my, 102, mh, {
    fill: COLORS.railPanel, border: COLORS.railBorder, lip: 2, r: 8
  });
  ctx.font = '700 10px ui-monospace, SFMono-Regular, Menlo, monospace';
  ctx.fillStyle = COLORS.textMuted;
  ctx.fillText('REROLLS', rx2 + 51, my + 9);
  ctx.font = '900 20px ui-monospace, SFMono-Regular, Menlo, monospace';
  ctx.fillStyle = state.rerollsLeft === 0 ? COLORS.textDim : COLORS.brassBright;
  ctx.fillText(String(state.rerollsLeft), rx2 + 51, my + 23);
  drawPipDots(ctx, rx2 + 51, my + 52, state.rerollsLeft, maxRerolls, COLORS.brassBright);

  // Treasury / Bankroll
  const bx = rx2 + 110;
  const nextInterest = Math.min(MAX_INTEREST, Math.floor(state.money / 5));
  drawBevelPanel(ctx, bx, my, 134, mh, {
    fill: '#1E1814', border: '#6E5623', lip: 2, r: 8
  });
  ctx.textAlign = 'center';
  ctx.font = '700 10px ui-monospace, SFMono-Regular, Menlo, monospace';
  ctx.fillStyle = COLORS.textMuted;
  ctx.fillText('MONEY', bx + 67, my + 9);
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

  // 2. Center Score Formula Dial Bar
  const fx = 250, fy = 110, fw = 780, fh = 58;
  drawBevelPanel(ctx, fx, fy, fw, fh, {
    fill: 'rgba(20, 14, 34, 0.90)',
    border: COLORS.brass,
    lip: 3,
    r: 28
  });

  const maxSelect = getMaxSelectDice();
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.font = '900 18px ui-sans-serif, system-ui, sans-serif';
  ctx.fillStyle = state.liveHandName ? COLORS.brassBright : COLORS.textDim;
  ctx.fillText(state.liveHandName ? state.liveHandName.toUpperCase() : `SELECT 1–${maxSelect} DICE`, fx + 26, fy + 21);

  ctx.font = '600 11px ui-monospace, SFMono-Regular, Menlo, monospace';
  if (state.mode === 'SCORING' && state.scoringHandTotal > 0) {
    ctx.fillStyle = COLORS.goldLight;
    ctx.fillText('HAND PAYOUT: +' + fmtNum(state.scoringHandTotal) + ' PTS', fx + 26, fy + 41);
  } else if (state.liveHandName) {
    const sel = state.dice.filter(d => d.selected);
    const pipSum = sel.reduce((a, d) => {
      const eff = d.effectiveValue || d.value;
      return a + (isDieDebuffedByBoss(eff) ? 0 : eff);
    }, 0);
    ctx.fillStyle = COLORS.textMuted;
    ctx.fillText(`+${pipSum} die pips + face mods on roll`, fx + 26, fy + 41);
  } else {
    ctx.fillStyle = COLORS.textDim;
    ctx.fillText('Hover any die to inspect its 6 faces', fx + 26, fy + 41);
  }

  // Right of Formula: Teal Base Pill × Crimson-Flame Multiplier Pill = Projected Total
  const pillY = fy + 10, pillW = 112, pillH = 38;
  const basePillX = fx + 330;

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

  ctx.font = '900 20px ui-sans-serif, system-ui, sans-serif';
  ctx.fillStyle = COLORS.brassBright;
  ctx.fillText('×', basePillX + pillW + 18, pillY + pillH / 2);

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
// BOTTOM ARCANA CARD DOCK
// ============================================================================
export function drawModifierCardTray(ctx, state, uiCtx) {
  const {
    getUsedCardSlots,
    getMaxCardSlots,
    getBaseCardSlots,
    isCardDebuffedByBoss,
    moveActiveCard,
    sellActiveCard
  } = uiCtx;

  const x = 200, y = 554, w = 880, h = 192;
  drawBevelPanel(ctx, x, y, w, h, {
    fill: 'rgba(15, 10, 28, 0.86)',
    border: COLORS.railBorderBright,
    lip: 4,
    r: 12
  });

  const usedSlots = getUsedCardSlots();
  const maxSlots = getMaxCardSlots();
  const baseSlots = getBaseCardSlots();
  const negBonus = maxSlots - baseSlots;

  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';
  ctx.font = '800 11.5px ui-monospace, SFMono-Regular, Menlo, monospace';
  ctx.fillStyle = COLORS.brassBright;
  ctx.fillText('♦ ARCANA MODIFIER DOCK', x + 18, y + 10);

  ctx.fillStyle = COLORS.textMuted;
  ctx.font = '700 11.5px ui-monospace, SFMono-Regular, Menlo, monospace';
  const slotLabel = negBonus > 0
    ? `·  ${state.activeCards.length} / ${maxSlots} SLOTS (+${negBonus} Negative)`
    : `·  ${usedSlots} / ${baseSlots} SLOTS`;
  ctx.fillText(slotLabel, x + 195, y + 10);

  ctx.textAlign = 'right';
  ctx.font = '600 11px ui-sans-serif, system-ui, sans-serif';
  ctx.fillStyle = COLORS.textMuted;

  const layout = getActiveCardLayout(state);
  if (state.activeCards.length === 0) {
    const emptyW = 104, emptyH = 140, gap = 22;
    const tot = baseSlots * emptyW + (baseSlots - 1) * gap;
    const sx = x + (w - tot) / 2;
    for (let i = 0; i < baseSlots; i++) {
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
    ctx.fillText('Clear Chapter 1 to visit the Parlor Bazaar for Arcana Cards, Tickets & Dice Upgrades', x + w / 2, y + 102);
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
    getMaxSelectDice,
    playSelectedHand,
    triggerReroll,
    clearSelectedDice
  } = uiCtx;

  const cx = 640;
  const maxSelect = getMaxSelectDice();
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

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
    ctx.fillText(`Select up to ${maxSelect} dice to score · Hover any die to inspect its 6 faces`, cx, 201);
  }

  // Recessed Art-Deco Octagonal Dice Tray
  tracePixelRect(ctx, 180, 232, 920, 224, 24);
  ctx.fillStyle = 'rgba(8, 4, 16, 0.48)';
  ctx.fill();
  ctx.strokeStyle = 'rgba(212, 163, 89, 0.25)';
  ctx.lineWidth = 2;
  ctx.stroke();

  tracePixelRect(ctx, 188, 240, 904, 208, 18);
  ctx.strokeStyle = 'rgba(212, 163, 89, 0.10)';
  ctx.lineWidth = 1;
  ctx.stroke();

  // Draw all dice in pool (5..7) and detect hover for Dice Inspector
  for (const d of state.dice) {
    const effVal = d.effectiveValue || d.value;
    drawDie(ctx, state, d, false, isDieDebuffedByBoss(effVal));
  }

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
    sublabel: selectedCount >= minDiceNeeded ? `${state.liveHandName}  [Space]` : `Select ${minDiceNeeded}–${maxSelect} Dice`,
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
    sublabel: selectedCount > 0 ? `Keep ${selectedCount} locked  [R]` : `Tumble all ${state.dice.length} dice  [R]`,
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

// ============================================================================
// DICE INSPECTOR TOOLTIP (Hovering over any die on the table shows all 6 faces)
// ============================================================================
export function drawDieInspectorTooltip(ctx, state, uiCtx) {
  if (state.mode !== 'PLAYING' || state.modal || state.hoveredCard) return;
  if (state.hoveredDieIdx === undefined || state.hoveredDieIdx === -1) return;
  const die = state.dice[state.hoveredDieIdx];
  if (!die || !Array.isArray(die.faces) || die.tumbleTimer > 0.05) return;

  const { LOGICAL_W } = uiCtx;
  const tipW = 368;
  const tipH = 148;
  const liftY = die.selected ? -34 : 0;
  let tx = die.x - tipW / 2;
  tx = clamp(tx, 24, LOGICAL_W - tipW - 24);
  let ty = die.y + liftY - tipH - 64;
  if (ty < 14) ty = die.y + 68;

  drawBevelPanel(ctx, tx, ty, tipW, tipH, {
    fill: 'rgba(14, 10, 26, 0.97)',
    border: COLORS.brassBright,
    lip: 4,
    r: 10,
    glow: 'rgba(0,0,0,0.65)'
  });

  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';
  ctx.font = '800 13px ui-sans-serif, system-ui, sans-serif';
  ctx.fillStyle = COLORS.brassBright;
  ctx.fillText(`DIE #${die.id + 1} INSPECTOR  ·  ALL 6 FACES`, tx + 14, ty + 11);

  const curFace = die.faces[die.faceIndex];
  const curModMeta = curFace && curFace.mod ? FACE_MOD_META[curFace.mod] : null;
  ctx.textAlign = 'right';
  ctx.font = '700 11px ui-monospace, SFMono-Regular, Menlo, monospace';
  ctx.fillStyle = curModMeta ? curModMeta.color : COLORS.textMuted;
  ctx.fillText(
    curModMeta ? `Rolled: ${die.value} (${curModMeta.name})` : `Rolled Face: ${die.value}`,
    tx + tipW - 14,
    ty + 12
  );

  // Draw all 6 faces in a horizontal row
  const cellSize = 46;
  const gap = 11;
  const startX = tx + 18 + cellSize / 2;
  const faceCy = ty + 62;

  for (let i = 0; i < DICE_SIDES; i++) {
    const f = die.faces[i];
    const fCx = startX + i * (cellSize + gap);
    const isCurrentRolled = i === die.faceIndex;

    if (isCurrentRolled) {
      tracePixelRect(ctx, fCx - cellSize / 2 - 3, faceCy - cellSize / 2 - 3, cellSize + 6, cellSize + 6, 12);
      ctx.strokeStyle = COLORS.emerald;
      ctx.lineWidth = 2;
      ctx.stroke();
    }

    drawDieFaceMini(ctx, f, fCx, faceCy, cellSize, { selected: isCurrentRolled });

    // Caption under each face
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    ctx.font = '700 9.5px ui-monospace, SFMono-Regular, Menlo, monospace';
    if (f.mod) {
      const mm = FACE_MOD_META[f.mod];
      ctx.fillStyle = mm.color;
      ctx.fillText(mm.short, fCx, faceCy + cellSize / 2 + 6);
    } else {
      ctx.fillStyle = COLORS.textMuted;
      ctx.fillText(`Val ${f.value}`, fCx, faceCy + cellSize / 2 + 6);
    }
  }

  // Footer summary
  ctx.textAlign = 'center';
  ctx.font = '600 11px ui-sans-serif, system-ui, sans-serif';
  ctx.fillStyle = COLORS.textMuted;
  ctx.fillText(
    curModMeta ? curModMeta.desc : 'Upgrade individual faces in the Bazaar Dice Workshop',
    tx + tipW / 2,
    ty + tipH - 21
  );
}

export function drawCashOutPanel(ctx, state, uiCtx) {
  const { getStageLabel, claimCashOut } = uiCtx;
  const d = state.cashOutData;
  if (!d) return;
  const extraRows = (d.cardRerollsBonus > 0 ? 1 : 0) + (d.cardHandsBonus > 0 ? 1 : 0) + (d.artefactBonus > 0 ? 1 : 0) + (d.clothBonus > 0 ? 1 : 0);
  const w = 600, h = 344 + extraRows * 38;
  const x = (1280 - w) / 2, y = 186 - extraRows * 19;
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
    { label: `MONEY Interest ($1 per $5 held, max $5)`, val: `+$${d.interest}`, show: state.cashOutReveal >= 0.75 }
  ];
  if (d.cardRerollsBonus > 0) {
    rows.push({ label: `Card Bonus: Rerolls Left (${d.rerollsCount})`, val: `+$${d.cardRerollsBonus}`, show: state.cashOutReveal >= 0.75 });
  }
  if (d.cardHandsBonus > 0) {
    rows.push({ label: `Card Bonus: Unused Hands (${d.handsCount})`, val: `+$${d.cardHandsBonus}`, show: state.cashOutReveal >= 0.75 });
  }
  if (d.artefactBonus > 0) {
    rows.push({ label: `Artefact Bonus (Greed Curse)`, val: `+$${d.artefactBonus}`, show: state.cashOutReveal >= 0.75 });
  }
  if (d.clothBonus > 0) {
    rows.push({ label: `White Silk Payout Bonus`, val: `+$${d.clothBonus}`, show: state.cashOutReveal >= 0.75 });
  }

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
    d.isRunVictory ? 'CLAIM VICTORY' : 'COLLECT & VISIT BAZAAR', {
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

// ============================================================================
// EXPANDED PARLOR BAZAAR: TICKET ALCOVE + ARCANA CARDS + DICE WORKSHOP
// ============================================================================
export function drawShopArena(ctx, state, uiCtx) {
  const {
    getStageLabel,
    getStageTarget,
    getMaxCardSlots,
    getShopCardSlotCount,
    getShopRerollCost,
    buyShopCard,
    buyShopTicket,
    openWorkshopModal,
    rerollShop,
    startStage
  } = uiCtx;

  const w = 1232, h = 366;
  const x = 24, y = 176;
  drawBevelPanel(ctx, x, y, w, h, {
    fill: 'rgba(18, 12, 32, 0.93)',
    border: COLORS.brass,
    lip: 5,
    r: 14
  });

  // Shop Header
  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';
  ctx.font = '900 20px ui-sans-serif, system-ui, sans-serif';
  ctx.fillStyle = COLORS.brassBright;
  ctx.fillText('♦ ARCANA PARLOR BAZAAR & DICE WORKSHOP', x + 22, y + 14);

  if (state.noticeTimer > 0 && state.noticeText) {
    ctx.textAlign = 'center';
    ctx.font = '700 13px ui-sans-serif, system-ui, sans-serif';
    ctx.fillStyle = '#FDA4AF';
    ctx.fillText(state.noticeText, x + w / 2 + 30, y + 16);
  }

  const nextStage = state.stage + 1;
  const nextIsBoss = nextStage % 3 === 0;
  ctx.textAlign = 'right';
  ctx.font = '700 12px ui-monospace, SFMono-Regular, Menlo, monospace';
  ctx.fillStyle = nextIsBoss ? COLORS.multLight : COLORS.textMuted;
  ctx.fillText(
    `Next: Chapter ${nextStage} (${getStageLabel(nextStage)}) · Goal ${fmtNum(getStageTarget(nextStage))}`,
    x + w - 22,
    y + 18
  );

  // -------------------------------------------------------------------------
  // 1. LEFT ALCOVE: STAKE TICKET ($10, Refreshes every 3 stages)
  // -------------------------------------------------------------------------
  const vx = x + 18, vy = y + 44, vw = 194, vh = 304;
  drawBevelPanel(ctx, vx, vy, vw, vh, {
    fill: 'rgba(10, 6, 20, 0.75)',
    border: '#6E5623',
    lip: 3,
    r: 10
  });

  const currentStake = Math.floor((state.stage - 1) / 3) + 1;
  ctx.textAlign = 'center';
  ctx.font = '800 11px ui-monospace, SFMono-Regular, Menlo, monospace';
  ctx.fillStyle = COLORS.brassBright;
  ctx.fillText(`STAKE ${currentStake} TICKET`, vx + vw / 2, vy + 12);

  ctx.font = '600 10px ui-sans-serif, system-ui, sans-serif';
  ctx.fillStyle = COLORS.textMuted;
  ctx.fillText('Permanent Run Upgrade', vx + vw / 2, vy + 28);

  const ticket = state.shopTicket;
  if (!ticket || ticket.purchased) {
    tracePixelRect(ctx, vx + 16, vy + 52, vw - 32, 178, 10);
    ctx.fillStyle = 'rgba(255,255,255,0.03)';
    ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,0.08)';
    ctx.stroke();

    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = '800 13px ui-monospace, SFMono-Regular, Menlo, monospace';
    ctx.fillStyle = COLORS.textDim;
    ctx.fillText(ticket && ticket.purchased ? 'TICKET CLAIMED' : 'SOLD OUT', vx + vw / 2, vy + 130);
    ctx.font = '600 10.5px ui-sans-serif, system-ui, sans-serif';
    ctx.fillText('Refreshes next Stake', vx + vw / 2, vy + 152);
  } else {
    // Draw ornate serrated Ticket with perforated stub & icon
    const tx = vx + 14, ty = vy + 46, tw = vw - 28, th = 190;
    ctx.save();
    traceTicketRect(ctx, tx, ty + 4, tw, th, 9, 8);
    ctx.fillStyle = 'rgba(0, 0, 0, 0.45)';
    ctx.fill();

    traceTicketRect(ctx, tx, ty, tw, th, 9, 8);
    const tGrad = ctx.createLinearGradient(tx, ty, tx, ty + th);
    tGrad.addColorStop(0, '#2A1B4E');
    tGrad.addColorStop(0.55, '#1B1136');
    tGrad.addColorStop(1, '#120A24');
    ctx.fillStyle = tGrad;
    ctx.fill();
    ctx.strokeStyle = ticket.color;
    ctx.lineWidth = 2;
    ctx.stroke();

    // Inner dashed ticket border
    traceTicketRect(ctx, tx + 5, ty + 5, tw - 10, th - 10, 6, 6);
    ctx.strokeStyle = 'rgba(245, 205, 121, 0.25)';
    ctx.lineWidth = 1;
    ctx.setLineDash([3, 3]);
    ctx.stroke();
    ctx.setLineDash([]);

    // Perforated horizontal tear line between stub & body
    const perfY = ty + th * 0.42;
    ctx.strokeStyle = 'rgba(245, 205, 121, 0.42)';
    ctx.lineWidth = 1.2;
    ctx.setLineDash([4, 4]);
    ctx.beginPath();
    ctx.moveTo(tx + 12, perfY);
    ctx.lineTo(tx + tw - 12, perfY);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.restore();
    drawTicketIcon(ctx, ticket, tx + tw / 2, (ty + perfY) / 2, 20, state.time);

    // Lower body: Ticket Title & Wrapped description
    ctx.textBaseline = 'top';
    ctx.font = '900 14.5px ui-sans-serif, system-ui, sans-serif';
    ctx.fillStyle = COLORS.textMain;
    ctx.fillText(ticket.name, tx + tw / 2, perfY + 10);

    ctx.font = '600 11px ui-sans-serif, system-ui, sans-serif';
    ctx.fillStyle = '#DDD6FE';
    const tLines = wrapLines(ctx, ticket.desc, tw - 24);
    tLines.slice(0, 4).forEach((ln, i) => {
      ctx.fillText(ln, tx + tw / 2, perfY + 32 + i * 14);
    });

    const canAffordT = state.money >= TICKET_COST && !state.modal;
    registerButton(ctx, state, 'shop_buy_ticket', vx + 14, vy + vh - 56, vw - 28, 42, `REDEEM $${TICKET_COST}`, {
      fill: canAffordT ? '#7C2D12' : '#1B162A',
      hoverFill: '#9A3412',
      border: canAffordT ? COLORS.goldLight : COLORS.railBorder,
      fontSize: 13.5,
      disabled: !canAffordT,
      onClick: buyShopTicket
    });
  }

  // -------------------------------------------------------------------------
  // 2. CENTER SHOWCASE: 3 OR 4 ARCANA PLAYING CARDS
  // -------------------------------------------------------------------------
  const slotCount = getShopCardSlotCount();
  const rects = getShopCardRects(slotCount);
  const slotsFull = state.activeCards.length >= getMaxCardSlots();

  rects.forEach((r, idx) => {
    const card = state.shopCards[idx];

    tracePixelRect(ctx, r.x - 10, r.y - 10, r.w + 20, r.h + 64, 10);
    ctx.fillStyle = 'rgba(9, 6, 18, 0.68)';
    ctx.fill();
    ctx.strokeStyle = 'rgba(212, 163, 89, 0.16)';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    if (!card) {
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.font = '800 13px ui-monospace, SFMono-Regular, Menlo, monospace';
      ctx.fillStyle = COLORS.textDim;
      ctx.fillText('ACQUIRED', r.x + r.w / 2, r.y + r.h / 2);
      return;
    }

    const hovered = !state.modal && hitTest(state.mouseX, state.mouseY, r);
    if (hovered) {
      state.hoveredCard = { zone: 'shop', card, idx, rect: r };
    }

    drawPlayingCard(ctx, state, card, r.x + r.w / 2, r.y + r.h / 2, r.w, r.h, {
      hovered
    });

    const isNeg = card.edition === 'negative';
    const canAfford = state.money >= card.price;
    const canFit = isNeg || !slotsFull;
    const buyDisabled = !canAfford || !canFit || Boolean(state.modal);
    let buyLabel = `DRAFT $${card.price}`;
    if (!canFit) buyLabel = 'DOCK FULL';
    else if (isNeg) buyLabel = `DRAFT $${card.price} (+1)`;

    registerButton(ctx, state, `shop_buy_${idx}`, r.x - 2, r.y + r.h + 10, r.w + 4, 34, buyLabel, {
      fill: buyDisabled ? '#1B162A' : '#0F766E',
      hoverFill: '#0D9488',
      border: buyDisabled ? COLORS.railBorder : '#5EEAD4',
      fontSize: 12.5,
      disabled: buyDisabled,
      onClick: () => buyShopCard(idx)
    });
  });

  // -------------------------------------------------------------------------
  // 3. RIGHT SECTION: DICE WORKSHOP (2 Gemstone Upgrades, $4 each) + BAZAAR ACTIONS
  // -------------------------------------------------------------------------
  const wx = 812, wy = y + 44, ww = 232, wh = 304;
  drawBevelPanel(ctx, wx, wy, ww, wh, {
    fill: 'rgba(10, 6, 20, 0.75)',
    border: COLORS.railBorderBright,
    lip: 3,
    r: 10
  });

  ctx.textAlign = 'center';
  ctx.textBaseline = 'top';
  ctx.font = '800 11px ui-monospace, SFMono-Regular, Menlo, monospace';
  ctx.fillStyle = '#38BDF8';
  ctx.fillText('⚒ DICE WORKSHOP', wx + ww / 2, wy + 12);
  ctx.font = '600 10px ui-sans-serif, system-ui, sans-serif';
  ctx.fillStyle = COLORS.textMuted;
  ctx.fillText('Craft onto any die face', wx + ww / 2, wy + 27);

  for (let i = 0; i < 2; i++) {
    const upg = state.shopDiceUpgrades ? state.shopDiceUpgrades[i] : null;
    const uy = wy + 46 + i * 124;
    const uw = ww - 24;
    const uh = 114;
    const ux = wx + 12;

    drawBevelPanel(ctx, ux, uy, uw, uh, {
      fill: upg ? '#1A1330' : 'rgba(255,255,255,0.02)',
      border: upg ? upg.color : 'rgba(255,255,255,0.08)',
      lip: 2,
      r: 8
    });

    if (!upg) {
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.font = '800 12px ui-monospace, SFMono-Regular, Menlo, monospace';
      ctx.fillStyle = COLORS.textDim;
      ctx.fillText('CRAFTED', ux + uw / 2, uy + uh / 2);
      continue;
    }

    drawGemstoneIcon(ctx, upg.id, ux + 24, uy + 38, 15, state.time);

    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    ctx.font = '800 12.5px ui-sans-serif, system-ui, sans-serif';
    ctx.fillStyle = COLORS.textMain;
    ctx.fillText(upg.name, ux + 44, uy + 9);

    ctx.font = '800 9.5px ui-monospace, SFMono-Regular, Menlo, monospace';
    ctx.fillStyle = upg.color;
    ctx.fillText(upg.tag, ux + 44, uy + 25);

    ctx.font = '600 10px ui-sans-serif, system-ui, sans-serif';
    ctx.fillStyle = COLORS.textMuted;
    const uLines = wrapLines(ctx, upg.desc, uw - 52);
    uLines.slice(0, 2).forEach((ln, li) => {
      ctx.fillText(ln, ux + 44, uy + 42 + li * 13);
    });

    const canAffordU = state.money >= upg.price && !state.modal;
    registerButton(ctx, state, `shop_workshop_${i}`, ux + 10, uy + uh - 34, uw - 20, 26, `FORGE FACE $${upg.price}`, {
      fill: canAffordU ? '#0369A1' : '#1B162A',
      hoverFill: '#0284C7',
      border: canAffordU ? '#7DD3FC' : COLORS.railBorder,
      fontSize: 11,
      lip: 2,
      disabled: !canAffordU,
      onClick: () => openWorkshopModal(i)
    });
  }

  // Far-Right Action Column: Refresh Bazaar & Next Chapter
  const sideX = 1058;
  const sideW = 180;
  const rerollCost = getShopRerollCost ? getShopRerollCost() : 3;
  registerButton(ctx, state, 'shop_reroll', sideX, wy + 34, sideW, 68, `REFRESH ($${rerollCost})`, {
    fill: '#B45309',
    hoverFill: '#D97706',
    border: '#FCD34D',
    fontSize: 14.5,
    sublabel: 'Cards & Tools  [R]',
    disabled: state.money < rerollCost || Boolean(state.modal),
    onClick: rerollShop
  });

  registerButton(ctx, state, 'shop_next', sideX, wy + 122, sideW, 76, `CHAPTER ${nextStage} ▸`, {
    fill: '#6D28D9',
    hoverFill: '#7C3AED',
    border: '#C4B5FD',
    fontSize: 16,
    sublabel: `${getStageLabel(nextStage)}  [Space]`,
    glow: 'rgba(167, 139, 250, 0.35)',
    disabled: Boolean(state.modal),
    onClick: () => startStage(nextStage)
  });

  ctx.textAlign = 'center';
  ctx.font = '600 11px ui-sans-serif, system-ui, sans-serif';
  ctx.fillStyle = COLORS.textMuted;
  ctx.fillText('Save $5 increments', sideX + sideW / 2, wy + 232);
  ctx.fillText('for up to +$5 Interest', sideX + sideW / 2, wy + 248);
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
    const bonusStr = def.isScalingXMult
      ? `x${Math.round((1 + (card.scalingBonus || 0)) * 100) / 100} Mult`
      : `+${card.scalingBonus || 0} Mult`;
    ctx.fillText(`Current Bonus: ${bonusStr}`, tx + 14, curY);
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
  const { openClothSelect, startNewRun, LOGICAL_W } = uiCtx;

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
  ctx.font = '600 15.5px ui-sans-serif, system-ui, sans-serif';
  ctx.fillStyle = COLORS.textMuted;
  ctx.fillText('Forge custom dice faces · Redeem Tickets · Dock Arcana cards · Conquer chapters + Endless', fanCx, 250);

  registerButton(ctx, state, 'title_play', fanCx - 140, 286, 280, 62, 'ENTER PARLOR', {
    fill: '#0F766E',
    hoverFill: '#0D9488',
    border: '#5EEAD4',
    fontSize: 22,
    sublabel: 'Press Enter or Space',
    glow: 'rgba(45, 212, 191, 0.4)',
    onClick: openClothSelect || startNewRun
  });

  registerButton(ctx, state, 'title_guide', fanCx - 175, 650, 165, 42, 'HANDS & RULES', {
    fill: COLORS.railPanel, hoverFill: '#2D224A', fontSize: 13,
    onClick: () => { sfx.click(); state.modal = 'GUIDE'; }
  });
  registerButton(ctx, state, 'title_crt', fanCx + 10, 650, 165, 42, state.crtEnabled ? 'CRT GLOW: ON' : 'CRT GLOW: OFF', {
    fill: COLORS.railPanel, hoverFill: '#2D224A', fontSize: 13,
    onClick: () => { sfx.click(); state.crtEnabled = !state.crtEnabled; }
  });

  if (state.stats.bestHand > 0 || state.stats.wins > 0) {
    ctx.font = '700 13px ui-monospace, SFMono-Regular, Menlo, monospace';
    ctx.fillStyle = COLORS.brassBright;
    ctx.fillText(
      `Best Hand: ${fmtNum(state.stats.bestHand)}   ·   Best Chapter: ${state.stats.bestStage}   ·   Runs Won: ${state.stats.wins}`,
      fanCx,
      720
    );
  }

  ctx.font = '600 12.5px ui-monospace, SFMono-Regular, Menlo, monospace';
  ctx.fillStyle = COLORS.textDim;
}

export function drawClothSelectScreen(ctx, state, uiCtx) {
  const { startNewRun, LOGICAL_W, LOGICAL_H } = uiCtx;
  const activeCloth = CLOTH_BY_ID[state.selectedClothId] || CLOTH_CATALOG[0];
  const activeDiff = DIFFICULTY_BY_ID[state.selectedDifficultyId] || DIFFICULTY_CATALOG[0];

  // Subtle dark parlor backdrop
  ctx.fillStyle = 'rgba(7, 3, 16, 0.72)';
  ctx.fillRect(0, 0, LOGICAL_W, LOGICAL_H);

  const pw = 1140, ph = 640;
  const px = (LOGICAL_W - pw) / 2;
  const py = (LOGICAL_H - ph) / 2;

  drawBevelPanel(ctx, px, py, pw, ph, {
    fill: 'rgba(18, 12, 32, 0.94)',
    border: COLORS.brassBright,
    lip: 6,
    r: 16,
    glow: 'rgba(245, 205, 121, 0.18)'
  });

  // Header
  ctx.textAlign = 'center';
  ctx.textBaseline = 'top';
  ctx.font = '900 30px ui-sans-serif, system-ui, sans-serif';
  ctx.fillStyle = COLORS.goldLight;
  ctx.fillText('CHOOSE YOUR TABLE CLOTH', px + pw / 2, py + 24);

  ctx.font = '600 13.5px ui-sans-serif, system-ui, sans-serif';
  ctx.fillStyle = COLORS.textMuted;
  ctx.fillText('Select a velvet cloth for this run', px + pw / 2, py + 64);

  const gridX = px + 34;
  const gridY = py + 106;
  const cardW = 166, cardH = 196, gapX = 16, gapY = 18;

  CLOTH_CATALOG.forEach((cloth, idx) => {
    const col = idx % 4;
    const row = Math.floor(idx / 4);
    const cx = gridX + col * (cardW + gapX);
    const cy = gridY + row * (cardH + gapY);
    const rect = { x: cx, y: cy, w: cardW, h: cardH };
    const hovered = hitTest(state.mouseX, state.mouseY, rect);
    const selected = cloth.id === activeCloth.id;

    drawBevelPanel(ctx, cx, cy, cardW, cardH, {
      fill: selected ? '#241842' : hovered ? '#1C1434' : '#120C22',
      border: selected ? COLORS.goldLight : hovered ? cloth.color : COLORS.railBorderBright,
      lip: selected ? 4 : 3,
      r: 12,
      glow: selected ? `${cloth.color}55` : null
    });

    const swSize = 96;
    drawClothSwatch(ctx, cloth, cx + (cardW - swSize) / 2, cy + 18, swSize, swSize, {
      selected,
      hovered
    });

    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    ctx.font = '800 13.5px ui-sans-serif, system-ui, sans-serif';
    ctx.fillStyle = selected ? COLORS.goldLight : COLORS.textMain;
    ctx.fillText(cloth.name, cx + cardW / 2, cy + 126);

    ctx.font = '800 10px ui-monospace, SFMono-Regular, Menlo, monospace';
    ctx.fillStyle = selected ? '#5EEAD4' : cloth.color;
    ctx.fillText(selected ? '★ SELECTED' : cloth.tag, cx + cardW / 2, cy + 150);

    registerButton(ctx, state, `cloth_pick_${cloth.id}`, cx, cy, cardW, cardH, '', {
      drawInvisible: true,
      onClick: () => {
        sfx.cardSnap();
        state.selectedClothId = cloth.id;
      }
    });
  });

  const rx = px + pw - 364;
  const ry = py + 106;
  const rw = 330;
  const rh = 496;

  drawBevelPanel(ctx, rx, ry, rw, rh, {
    fill: '#130D24',
    border: activeCloth.color,
    lip: 4,
    r: 14,
    glow: `${activeCloth.color}33`
  });

  ctx.textAlign = 'center';
  ctx.textBaseline = 'top';
  ctx.font = '800 10.5px ui-monospace, SFMono-Regular, Menlo, monospace';
  ctx.fillStyle = COLORS.brassBright;
  ctx.fillText('SELECTED TABLE CLOTH', rx + rw / 2, ry + 14);

  const bigSw = 104;
  drawClothSwatch(ctx, activeCloth, rx + (rw - bigSw) / 2, ry + 34, bigSw, bigSw, {
    selected: true
  });

  ctx.font = '900 20px ui-sans-serif, system-ui, sans-serif';
  ctx.fillStyle = COLORS.textMain;
  ctx.fillText(activeCloth.name, rx + rw / 2, ry + 148);

  // Tag pill
  ctx.fillStyle = 'rgba(10, 6, 20, 0.85)';
  ctx.fillRect(rx + 88, ry + 176, rw - 176, 20);
  ctx.font = '800 10.5px ui-monospace, SFMono-Regular, Menlo, monospace';
  ctx.fillStyle = activeCloth.color;
  ctx.textBaseline = 'middle';
  ctx.fillText(activeCloth.tag, rx + rw / 2, ry + 186);

  // Effect description box
  drawBevelPanel(ctx, rx + 20, ry + 204, rw - 40, 74, {
    fill: 'rgba(8, 5, 16, 0.72)',
    border: COLORS.railBorder,
    lip: 2,
    r: 10
  });
  ctx.textBaseline = 'top';
  ctx.font = '600 12px ui-sans-serif, system-ui, sans-serif';
  ctx.fillStyle = '#EDE9FE';
  const lines = wrapLines(ctx, activeCloth.desc, rw - 64);
  lines.slice(0, 3).forEach((ln, i) => {
    ctx.fillText(ln, rx + rw / 2, ry + 214 + i * 17);
  });

  ctx.textAlign = 'center';
  ctx.textBaseline = 'top';
  ctx.font = '800 10px ui-monospace, SFMono-Regular, Menlo, monospace';
  ctx.fillStyle = COLORS.brassBright;
  ctx.fillText('DIFFICULTY', rx + rw / 2, ry + 288);

  const diffW = 54, diffH = 48, diffGap = 10;
  const diffStartX = rx + (rw - (4 * diffW + 3 * diffGap)) / 2;
  const diffY = ry + 306;
  DIFFICULTY_CATALOG.forEach((diff, idx) => {
    const dx = diffStartX + idx * (diffW + diffGap);
    const dRect = { x: dx, y: diffY, w: diffW, h: diffH };
    const dHover = hitTest(state.mouseX, state.mouseY, dRect);
    const dSel = diff.id === activeDiff.id;

    drawBevelPanel(ctx, dx, diffY, diffW, diffH, {
      fill: dSel ? '#241842' : dHover ? '#1C1434' : '#0E091A',
      border: dSel ? COLORS.goldLight : dHover ? diff.color : COLORS.railBorderBright,
      lip: dSel ? 3 : 2,
      r: 8,
      glow: dSel ? `${diff.color}55` : null
    });

    drawDifficultyIcon(ctx, diff, dx + diffW / 2, diffY + diffH / 2, 34);

    registerButton(ctx, state, `diff_pick_${diff.id}`, dx, diffY, diffW, diffH, '', {
      drawInvisible: true,
      onClick: () => {
        sfx.cardSnap();
        state.selectedDifficultyId = diff.id;
      }
    });
  });

  ctx.textAlign = 'center';
  ctx.textBaseline = 'top';
  ctx.font = '800 12px ui-sans-serif, system-ui, sans-serif';
  ctx.fillStyle = activeDiff.color;
  ctx.fillText(activeDiff.name, rx + rw / 2, ry + 360);
  ctx.font = '600 10.5px ui-sans-serif, system-ui, sans-serif';
  ctx.fillStyle = COLORS.textMuted;
  ctx.fillText(activeDiff.desc, rx + rw / 2, ry + 377);

  registerButton(ctx, state, 'cloth_start_run', rx + 24, ry + rh - 102, rw - 48, 54, 'START RUN ▸', {
    fill: '#0F766E',
    hoverFill: '#0D9488',
    border: '#5EEAD4',
    fontSize: 19,
    sublabel: '[Enter / Space]',
    glow: 'rgba(45, 212, 191, 0.35)',
    onClick: () => startNewRun(activeCloth.id, activeDiff.id)
  });

  registerButton(ctx, state, 'cloth_back', rx + 64, ry + rh - 38, rw - 128, 28, '← BACK TO TITLE', {
    fill: COLORS.railPanel,
    hoverFill: '#2D224A',
    fontSize: 11.5,
    lip: 2,
    onClick: () => { sfx.click(); state.mode = 'TITLE_MENU'; }
  });
}

export function drawBottomSidePanels(ctx, state) {
  const lx = 16, ly = 554, lw = 174, lh = 192;
  const cloth = CLOTH_BY_ID[state.selectedClothId] || CLOTH_CATALOG[0];
  const clothRect = { x: lx, y: ly, w: lw, h: lh };
  const clothHovered = !state.modal && hitTest(state.mouseX, state.mouseY, clothRect);
  if (clothHovered) {
    state.hoveredCloth = { cloth, rect: clothRect };
  }

  drawBevelPanel(ctx, lx, ly, lw, lh, {
    fill: clothHovered ? '#1D1434' : 'rgba(15, 10, 28, 0.88)',
    border: clothHovered ? cloth.color : COLORS.railBorderBright,
    lip: 4,
    r: 12
  });

  ctx.textAlign = 'center';
  ctx.textBaseline = 'top';
  ctx.font = '800 10.5px ui-monospace, SFMono-Regular, Menlo, monospace';
  ctx.fillStyle = COLORS.brassBright;
  ctx.fillText('TABLE CLOTH', lx + lw / 2, ly + 10);

  const swSize = 84;
  drawClothSwatch(ctx, cloth, lx + (lw - swSize) / 2, ly + 30, swSize, swSize, {
    selected: true,
    hovered: clothHovered
  });

  ctx.font = '800 13px ui-sans-serif, system-ui, sans-serif';
  ctx.fillStyle = COLORS.textMain;
  const nameLines = wrapLines(ctx, cloth.name, lw - 18);
  nameLines.slice(0, 2).forEach((ln, i) => {
    ctx.fillText(ln, lx + lw / 2, ly + 122 + i * 16);
  });

  ctx.fillStyle = 'rgba(10, 6, 20, 0.85)';
  ctx.fillRect(lx + 26, ly + lh - 32, lw - 52, 18);
  ctx.textBaseline = 'middle';
  ctx.font = '800 10px ui-monospace, SFMono-Regular, Menlo, monospace';
  ctx.fillStyle = cloth.color;
  ctx.fillText(cloth.tag, lx + lw / 2, ly + lh - 23);

  const rx = 1090, ry = 554, rw = 174, rh = 192;
  const ownedEntries = Object.entries(state.tickets || {}).filter(([, count]) => count > 0);
  const totalTickets = ownedEntries.reduce((sum, [, count]) => sum + count, 0);

  drawBevelPanel(ctx, rx, ry, rw, rh, {
    fill: 'rgba(15, 10, 28, 0.88)',
    border: totalTickets > 0 ? COLORS.brass : COLORS.railBorderBright,
    lip: 4,
    r: 12
  });

  ctx.textAlign = 'center';
  ctx.textBaseline = 'top';
  ctx.font = '800 10.5px ui-monospace, SFMono-Regular, Menlo, monospace';
  ctx.fillStyle = COLORS.brassBright;
  ctx.fillText(`TICKETS (${totalTickets})`, rx + rw / 2, ry + 10);

  if (ownedEntries.length === 0) {
    ctx.font = '600 12px ui-sans-serif, system-ui, sans-serif';
    ctx.fillStyle = COLORS.textDim;
    ctx.textBaseline = 'middle';
    ctx.fillText('No Tickets', rx + rw / 2, ry + rh / 2 - 6);
    ctx.font = '600 10.5px ui-sans-serif, system-ui, sans-serif';
    ctx.fillText('Redeem in Bazaar', rx + rw / 2, ry + rh / 2 + 13);
  } else {
    const cols = ownedEntries.length > 4 ? 3 : 2;
    const rows = Math.ceil(ownedEntries.length / cols);
    const gap = 7;
    const availW = rw - 20;
    const availH = rh - 40;
    const tileW = Math.min(54, Math.floor((availW - (cols - 1) * gap) / cols));
    const tileH = Math.min(50, Math.floor((availH - (rows - 1) * gap) / rows));
    const startX = rx + Math.floor((rw - (cols * tileW + (cols - 1) * gap)) / 2);
    const startY = ry + 30;

    ownedEntries.forEach(([tId, count], idx) => {
      const ticket = TICKET_BY_ID[tId];
      if (!ticket) return;
      const col = idx % cols;
      const row = Math.floor(idx / cols);
      const tx = startX + col * (tileW + gap);
      const ty = startY + row * (tileH + gap);
      const rect = { x: tx, y: ty, w: tileW, h: tileH };
      const hovered = !state.modal && hitTest(state.mouseX, state.mouseY, rect);
      if (hovered) {
        state.hoveredTicket = { ticket, count, rect };
      }

      drawBevelPanel(ctx, tx, ty, tileW, tileH, {
        fill: hovered ? '#241842' : '#120C22',
        border: hovered ? COLORS.goldLight : ticket.color,
        lip: 2,
        r: 7
      });

      drawTicketIcon(ctx, ticket, tx + tileW / 2, ty + tileH / 2, Math.min(13, tileH * 0.34), state.time);

      if (count > 1) {
        ctx.fillStyle = 'rgba(10, 6, 20, 0.92)';
        ctx.fillRect(tx + tileW - 18, ty + tileH - 13, 16, 11);
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.font = '900 9px ui-monospace, SFMono-Regular, Menlo, monospace';
        ctx.fillStyle = COLORS.goldLight;
        ctx.fillText(`x${count}`, tx + tileW - 10, ty + tileH - 7.5);
      }
    });
  }
}

export function drawClothAndTicketTooltips(ctx, state, uiCtx) {
  if (state.modal) return;
  const { LOGICAL_W, LOGICAL_H } = uiCtx;

  const target = state.hoveredCloth
    ? {
        title: state.hoveredCloth.cloth.name,
        badge: state.hoveredCloth.cloth.tag,
        color: state.hoveredCloth.cloth.color,
        desc: state.hoveredCloth.cloth.desc,
        rect: state.hoveredCloth.rect
      }
    : state.hoveredTicket
      ? {
          title: state.hoveredTicket.ticket.name,
          badge: state.hoveredTicket.count > 1 ? `OWNED ×${state.hoveredTicket.count}` : 'TICKET',
          color: state.hoveredTicket.ticket.color,
          desc: state.hoveredTicket.ticket.desc,
          rect: state.hoveredTicket.rect
        }
      : null;

  if (!target) return;

  const tipW = 276;
  ctx.font = '600 12.5px ui-sans-serif, system-ui, sans-serif';
  const descLines = wrapLines(ctx, target.desc, tipW - 26);
  const tipH = 66 + descLines.length * 17;

  const tx = clamp(target.rect.x + target.rect.w / 2 - tipW / 2, 18, LOGICAL_W - tipW - 18);
  const ty = clamp(target.rect.y - tipH - 12, 14, LOGICAL_H - tipH - 14);

  drawBevelPanel(ctx, tx, ty, tipW, tipH, {
    fill: 'rgba(14, 10, 26, 0.97)',
    border: target.color,
    lip: 4,
    r: 10,
    glow: 'rgba(0,0,0,0.65)'
  });

  let curY = ty + 12;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';
  ctx.font = '800 14px ui-sans-serif, system-ui, sans-serif';
  ctx.fillStyle = COLORS.textMain;
  ctx.fillText(target.title, tx + 13, curY);

  ctx.textAlign = 'right';
  ctx.font = '800 10.5px ui-monospace, SFMono-Regular, Menlo, monospace';
  ctx.fillStyle = target.color;
  ctx.fillText(target.badge, tx + tipW - 13, curY + 2);

  curY += 24;
  ctx.textAlign = 'left';
  ctx.font = '600 12.5px ui-sans-serif, system-ui, sans-serif';
  ctx.fillStyle = '#EDE9FE';
  for (const line of descLines) {
    ctx.fillText(line, tx + 13, curY);
    curY += 17;
  }
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
  const { startNewRun, applyWorkshopUpgrade, LOGICAL_W, LOGICAL_H } = uiCtx;

  state.buttons = [];
  state.hoverButtonId = null;
  state.hoveredCard = null;
  ctx.fillStyle = 'rgba(7, 3, 16, 0.85)';
  ctx.fillRect(0, 0, LOGICAL_W, LOGICAL_H);

  // -------------------------------------------------------------------------
  // DICE WORKSHOP MODAL: Choose Die (1..N) & Choose Face (1..6) to Forge
  // -------------------------------------------------------------------------
  if (state.modal === 'WORKSHOP' && state.workshopTarget) {
    const { shopIdx, upgrade } = state.workshopTarget;
    const selectedDieIdx = clamp(state.workshopDieIdx || 0, 0, state.dicePool.length - 1);
    const targetDie = state.dicePool[selectedDieIdx];

    const w = 780, h = 470;
    const x = (LOGICAL_W - w) / 2, y = (LOGICAL_H - h) / 2;
    drawBevelPanel(ctx, x, y, w, h, {
      fill: '#140E24',
      border: upgrade.color,
      lip: 6,
      r: 14,
      glow: 'rgba(56, 189, 248, 0.25)'
    });

    drawGemstoneIcon(ctx, upgrade.id, x + 48, y + 48, 22, state.time);

    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    ctx.font = '900 24px ui-sans-serif, system-ui, sans-serif';
    ctx.fillStyle = upgrade.color;
    ctx.fillText(`DICE WORKSHOP: ${upgrade.name.toUpperCase()} ($${upgrade.price})`, x + 82, y + 24);

    ctx.font = '600 13.5px ui-sans-serif, system-ui, sans-serif';
    ctx.fillStyle = COLORS.textMain;
    ctx.fillText(upgrade.desc, x + 82, y + 56);

    registerButton(ctx, state, 'workshop_cancel', x + w - 132, y + 22, 100, 38, 'CANCEL', {
      fill: COLORS.railPanel, hoverFill: '#2D224A', fontSize: 13,
      onClick: () => { sfx.click(); state.modal = null; state.workshopTarget = null; }
    });

    // Step 1: Select which Die from Pool
    ctx.font = '800 12px ui-monospace, SFMono-Regular, Menlo, monospace';
    ctx.fillStyle = COLORS.brassBright;
    ctx.fillText('STEP 1 — SELECT A DIE FROM YOUR POOL:', x + 32, y + 96);

    const poolCount = state.dicePool.length;
    const tabW = Math.min(96, Math.floor((w - 64 - (poolCount - 1) * 10) / poolCount));
    for (let i = 0; i < poolCount; i++) {
      const tx = x + 32 + i * (tabW + 10);
      const isSel = i === selectedDieIdx;
      const modCount = state.dicePool[i].faces.filter(f => f.mod !== null || f.value > 6).length;
      registerButton(ctx, state, `ws_die_${i}`, tx, y + 118, tabW, 48, `DIE #${i + 1}`, {
        fill: isSel ? '#0F766E' : COLORS.railPanel,
        hoverFill: isSel ? '#0D9488' : '#2D224A',
        border: isSel ? '#5EEAD4' : COLORS.railBorderBright,
        fontSize: 13.5,
        sublabel: modCount > 0 ? `${modCount} forged` : 'Standard',
        lip: 2,
        onClick: () => { sfx.click(); state.workshopDieIdx = i; }
      });
    }

    // Step 2: Click one of the 6 faces on the selected Die to apply the upgrade
    ctx.textAlign = 'left';
    ctx.font = '800 12px ui-monospace, SFMono-Regular, Menlo, monospace';
    ctx.fillStyle = COLORS.brassBright;
    ctx.fillText(`STEP 2 — CLICK A FACE ON DIE #${selectedDieIdx + 1} TO APPLY ${upgrade.tag}:`, x + 32, y + 188);

    const cardW = 104, cardH = 178, gap = 16;
    const totalFacesW = 6 * cardW + 5 * gap;
    const startFX = x + (w - totalFacesW) / 2;
    const faceY = y + 216;

    for (let fIdx = 0; fIdx < DICE_SIDES; fIdx++) {
      const face = targetDie.faces[fIdx];
      const fx = startFX + fIdx * (cardW + gap);
      const fRect = { x: fx, y: faceY, w: cardW, h: cardH };
      const fHover = hitTest(state.mouseX, state.mouseY, fRect);
      const mm = face.mod ? FACE_MOD_META[face.mod] : null;

      drawBevelPanel(ctx, fx, faceY, cardW, cardH, {
        fill: fHover ? '#261C42' : '#18112C',
        border: fHover ? COLORS.brassBright : (mm ? mm.border : COLORS.railBorder),
        lip: 3,
        r: 10
      });

      ctx.textAlign = 'center';
      ctx.font = '700 10.5px ui-monospace, SFMono-Regular, Menlo, monospace';
      ctx.fillStyle = COLORS.textMuted;
      ctx.fillText(`FACE #${fIdx + 1}`, fx + cardW / 2, faceY + 10);

      drawDieFaceMini(ctx, face, fx + cardW / 2, faceY + 62, 58, { hovered: fHover });

      ctx.font = '800 11.5px ui-sans-serif, system-ui, sans-serif';
      ctx.fillStyle = COLORS.textMain;
      ctx.fillText(`Value: ${face.value}`, fx + cardW / 2, faceY + 100);

      ctx.font = '700 10px ui-monospace, SFMono-Regular, Menlo, monospace';
      ctx.fillStyle = mm ? mm.color : COLORS.textDim;
      ctx.fillText(mm ? mm.name : 'No Inlay', fx + cardW / 2, faceY + 118);

      const blockedByMin = upgrade.type === 'value_add' && upgrade.valueAdd < 0 && face.value <= (upgrade.minValue ?? 1);
      registerButton(ctx, state, `ws_apply_${fIdx}`, fx + 8, faceY + cardH - 38, cardW - 16, 28,
        blockedByMin ? 'MIN (1)' : 'APPLY', {
          fill: blockedByMin ? '#1B162A' : '#0369A1',
          hoverFill: '#0284C7',
          border: blockedByMin ? COLORS.railBorder : '#7DD3FC',
          fontSize: 11.5,
          lip: 2,
          disabled: blockedByMin,
          onClick: () => applyWorkshopUpgrade(shopIdx, selectedDieIdx, fIdx)
        });
    }

    ctx.textAlign = 'center';
    ctx.font = '600 11.5px ui-sans-serif, system-ui, sans-serif';
    ctx.fillStyle = COLORS.textMuted;
    ctx.fillText(
      'Tip: Amber Stone (+1 Value) stacks with existing Inlays; applying a new Inlay replaces the face’s current Inlay.',
      x + w / 2,
      y + h - 32
    );
    return;
  }

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
    const w = 880, h = 620;
    const x = (LOGICAL_W - w) / 2, y = (LOGICAL_H - h) / 2;
    drawBevelPanel(ctx, x, y, w, h, {
      fill: '#140E24', border: COLORS.brassBright, lip: 6, r: 14
    });

    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    ctx.font = '900 22px ui-sans-serif, system-ui, sans-serif';
    ctx.fillStyle = COLORS.brassBright;
    ctx.fillText('SCORING HANDS, FACE INLAYS & TICKETS', x + 28, y + 20);

    registerButton(ctx, state, 'guide_close', x + w - 120, y + 18, 92, 34, 'CLOSE', {
      fill: COLORS.railPanel, hoverFill: '#2D224A', fontSize: 13,
      onClick: () => { sfx.click(); state.modal = null; }
    });

    ctx.font = '800 12px ui-monospace, SFMono-Regular, Menlo, monospace';
    ctx.fillStyle = COLORS.textMuted;
    ctx.fillText('DICE HANDS', x + 220, y + 64);

    let hy = y + 88;
    for (const hid of HAND_ORDER.slice().reverse()) {
      const hd = HANDS[hid];
      drawBevelPanel(ctx, x + 28, hy, 440, 50, {
        fill: COLORS.railPanel, border: COLORS.railBorder, lip: 2, r: 7
      });
      ctx.textAlign = 'left';
      ctx.font = '800 14px ui-sans-serif, system-ui, sans-serif';
      ctx.fillStyle = COLORS.textMain;
      ctx.fillText(hd.name, x + 42, hy + 8);
      ctx.font = '600 11.5px ui-sans-serif, system-ui, sans-serif';
      ctx.fillStyle = COLORS.textMuted;
      ctx.fillText(hd.desc, x + 42, hy + 27);

      ctx.textAlign = 'right';
      ctx.font = '800 14px ui-monospace, SFMono-Regular, Menlo, monospace';
      ctx.fillStyle = COLORS.chipsLight;
      ctx.fillText(`${hd.chips}`, x + 394, hy + 17);
      ctx.fillStyle = COLORS.textMuted;
      ctx.fillText('×', x + 412, hy + 17);
      ctx.fillStyle = COLORS.multLight;
      ctx.fillText(`${hd.mult}`, x + 440, hy + 17);
      hy += 57;
    }

    const rx = x + 494;
    ctx.textAlign = 'left';
    ctx.font = '800 12px ui-monospace, SFMono-Regular, Menlo, monospace';
    ctx.fillStyle = COLORS.textMuted;
    ctx.fillText('DICE WORKSHOP UPGRADES', rx, y + 64);

    const upgList = [
      ['Amber Stone (+1 Val)', 'Permanently increases face value by +1 (7+)', '#F5CD79'],
      ['Ruby Stone (+15M)', 'Triggers +15 Mult when face is scored', '#FB7185'],
      ['Sapphire Stone (+50C)', 'Triggers +50 Base Points when scored', '#38BDF8'],
      ['Topaz Stone (+$3)', 'Grants +$3 immediately when scored', '#FEF08A'],
      ['Emerald Stone (x2M)', 'x2 Mult when scored (25% shatter chance)', '#A5F3FC'],
      ['Amethyst Stone (★Any)', 'Counts as whichever value maximizes hand', '#E879F9']
    ];
    let ey = y + 88;
    for (const [name, txt, col] of upgList) {
      ctx.font = '800 13px ui-sans-serif, system-ui, sans-serif';
      ctx.fillStyle = col;
      ctx.fillText(name, rx, ey);
      ctx.font = '600 11.5px ui-sans-serif, system-ui, sans-serif';
      ctx.fillStyle = '#DDD6FE';
      ctx.fillText(txt, rx, ey + 16);
      ey += 40;
    }

    ctx.font = '800 12px ui-monospace, SFMono-Regular, Menlo, monospace';
    ctx.fillStyle = COLORS.textMuted;
    ctx.fillText('CARD EDITIONS & TICKETS', rx, ey + 8);

    const edList = [
      ['Gilded / Crimson / Prism / Void', '+50 Base / +12 Mult / x1.5 Mult / +1 Dock Slot', '#F5CD79'],
      ['Heavy Cup / Wide Grip', '+1 Pool Die (up to 7) / +1 Combo Die (4-dice hands)', '#2DD4BF'],
      ['Loaded Wrist / Extra Sleeve', '+1 Reroll per stage / +1 Hand per stage', '#38BDF8'],
      ['Card Shark / VIP Pass', '+1 Max Card Slot / +1 Bazaar Card Slot', '#FEF08A']
    ];
    let vy = ey + 30;
    for (const [name, txt, col] of edList) {
      ctx.font = '800 12.5px ui-sans-serif, system-ui, sans-serif';
      ctx.fillStyle = col;
      ctx.fillText(name, rx, vy);
      ctx.font = '600 11px ui-sans-serif, system-ui, sans-serif';
      ctx.fillStyle = '#EDE9FE';
      ctx.fillText(txt, rx, vy + 15);
      vy += 38;
    }

    ctx.textAlign = 'center';
    ctx.font = '600 12px ui-monospace, SFMono-Regular, Menlo, monospace';
    ctx.fillStyle = COLORS.textMuted;
  }

}

export function drawPotionTray(ctx, state, uiCtx) {
  const { usePotion, sellPotion, getMaxPotionSlots } = uiCtx;
  const maxSlots = getMaxPotionSlots ? getMaxPotionSlots() : MAX_POTION_SLOTS;
  const x = 1044, y = 104, w = 220, h = 68;

  drawBevelPanel(ctx, x, y, w, h, {
    fill: 'rgba(18, 12, 32, 0.90)',
    border: state.potionScoreMult > 1 ? '#FB7185' : COLORS.railBorderBright,
    lip: 3,
    r: 10,
    glow: state.potionScoreMult > 1 ? 'rgba(251, 113, 133, 0.35)' : null
  });

  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';
  ctx.font = '800 10px ui-monospace, SFMono-Regular, Menlo, monospace';
  ctx.fillStyle = COLORS.brassBright;
  ctx.fillText(`POTIONS (${state.potions.length}/${maxSlots})`, x + 10, y + 6);

  if (state.potionScoreMult > 1) {
    ctx.textAlign = 'right';
    ctx.fillStyle = '#FDA4AF';
    ctx.fillText(`x${state.potionScoreMult} ARMED`, x + w - 10, y + 6);
  }

  const gap = maxSlots >= 4 ? 5 : 7;
  const slotW = Math.floor((w - 20 - (maxSlots - 1) * gap) / maxSlots);
  const slotH = 40;
  const startX = x + 10;
  const sy = y + 21;

  for (let i = 0; i < maxSlots; i++) {
    const sx = startX + i * (slotW + gap);
    const pot = state.potions[i] || null;
    const def = pot ? POTION_BY_ID[pot.id] : null;
    const rect = { x: sx, y: sy, w: slotW, h: slotH };
    const hovered = pot && !state.modal && hitTest(state.mouseX, state.mouseY, rect);
    const focused = pot && state.focusedPotionIdx === i && !state.modal;

    if (hovered) {
      state.hoveredPotion = { potion: pot, def, idx: i, rect };
    }

    drawBevelPanel(ctx, sx, sy, slotW, slotH, {
      fill: pot ? (focused ? '#261C42' : hovered ? '#1E1636' : '#120D22') : 'rgba(9, 6, 18, 0.65)',
      border: pot ? (focused ? COLORS.goldLight : hovered ? def.color : COLORS.railBorderBright) : '#261D40',
      lip: pot ? 2 : 0,
      r: 7
    });

    if (pot && def) {
      const bounceOffset = (pot.bounce || 0) * -6;
      drawPotionIcon(ctx, def.id, sx + slotW / 2, sy + slotH / 2 + 1 + bounceOffset, 15, state.time);
      registerButton(ctx, state, `potion_slot_${i}`, sx, sy, slotW, slotH, '', {
        drawInvisible: true,
        onClick: () => {
          sfx.click();
          state.focusedActiveUid = null;
          state.focusedPotionIdx = state.focusedPotionIdx === i ? null : i;
        }
      });

      if (focused) {
        const ay = sy + slotH + 6;
        const canUse = state.mode !== 'SCORING';
        registerButton(ctx, state, `potion_use_${i}`, sx - 6, ay, 36, 22, 'USE', {
          fill: '#0F766E',
          hoverFill: '#0D9488',
          border: '#5EEAD4',
          fontSize: 9.5,
          lip: 2,
          disabled: !canUse,
          onClick: () => usePotion(i)
        });
        registerButton(ctx, state, `potion_sell_${i}`, sx + 32, ay, 38, 22, `+$${def.sellPrice}`, {
          fill: '#92400E',
          hoverFill: '#B45309',
          border: COLORS.goldLight,
          fontSize: 9.5,
          lip: 2,
          onClick: () => sellPotion(i)
        });
      }
    }
  }
}

export function drawPotionTooltip(ctx, state, uiCtx) {
  const hp = state.hoveredPotion;
  if (!hp || state.modal) return;
  const { LOGICAL_W, LOGICAL_H } = uiCtx;
  const { def, rect } = hp;

  const tipW = 264;
  ctx.font = '600 12.5px ui-sans-serif, system-ui, sans-serif';
  const descLines = wrapLines(ctx, def.desc, tipW - 26);
  const tipH = 84 + descLines.length * 17;

  const tx = clamp(rect.x + rect.w / 2 - tipW / 2, 18, LOGICAL_W - tipW - 18);
  const ty = clamp(rect.y + rect.h + 10, 14, LOGICAL_H - tipH - 14);

  drawBevelPanel(ctx, tx, ty, tipW, tipH, {
    fill: 'rgba(14, 10, 26, 0.97)',
    border: def.color,
    lip: 4,
    r: 10,
    glow: 'rgba(0,0,0,0.65)'
  });

  let curY = ty + 12;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';
  ctx.font = '800 14px ui-sans-serif, system-ui, sans-serif';
  ctx.fillStyle = COLORS.textMain;
  ctx.fillText(def.name, tx + 13, curY);

  ctx.textAlign = 'right';
  ctx.font = '800 11px ui-monospace, SFMono-Regular, Menlo, monospace';
  ctx.fillStyle = def.color;
  ctx.fillText(def.short, tx + tipW - 13, curY + 2);

  curY += 24;
  ctx.textAlign = 'left';
  ctx.font = '600 12.5px ui-sans-serif, system-ui, sans-serif';
  ctx.fillStyle = '#EDE9FE';
  for (const line of descLines) {
    ctx.fillText(line, tx + 13, curY);
    curY += 17;
  }

  curY += 6;
  ctx.font = '700 11px ui-monospace, SFMono-Regular, Menlo, monospace';
  ctx.fillStyle = COLORS.goldLight;
  ctx.fillText(`Sell: +$${def.sellPrice}  ·  Click to Use / Sell`, tx + 13, curY);
}

export function drawPotionPickScreen(ctx, state, uiCtx) {
  const { pickPotionReward, enterShop, getMaxPotionSlots } = uiCtx;
  const maxSlots = getMaxPotionSlots ? getMaxPotionSlots() : MAX_POTION_SLOTS;
  const w = 780, h = 356;
  const x = (1280 - w) / 2, y = 182;

  drawBevelPanel(ctx, x, y, w, h, {
    fill: 'rgba(18, 12, 32, 0.95)',
    border: COLORS.brassBright,
    lip: 6,
    r: 14,
    glow: 'rgba(245, 205, 121, 0.25)'
  });

  ctx.textAlign = 'center';
  ctx.textBaseline = 'top';
  ctx.font = '900 24px ui-sans-serif, system-ui, sans-serif';
  ctx.fillStyle = '#5EEAD4';
  ctx.fillText('PHASE 2 COMPLETE — CHOOSE A CONSUMABLE POTION', x + w / 2, y + 20);

  ctx.font = '600 13px ui-sans-serif, system-ui, sans-serif';
  ctx.fillStyle = COLORS.textMuted;
  const full = state.potions.length >= maxSlots;
  ctx.fillText(
    full
      ? `Potion belt is full (${maxSlots}/${maxSlots}). Sell a potion above to make room, or skip to Bazaar.`
      : `Pick 1 of 3 consumable potions to store in your belt (max ${maxSlots} slots).`,
    x + w / 2,
    y + 52
  );

  const choices = state.potionChoices || [];
  const cardW = 216, cardH = 200, gap = 22;
  const startX = x + (w - (choices.length * cardW + (choices.length - 1) * gap)) / 2;
  const cy = y + 86;

  choices.forEach((pId, idx) => {
    const def = POTION_BY_ID[pId];
    if (!def) return;
    const px = startX + idx * (cardW + gap);
    const hovered = hitTest(state.mouseX, state.mouseY, { x: px, y: cy, w: cardW, h: cardH });

    drawBevelPanel(ctx, px, cy, cardW, cardH, {
      fill: hovered ? '#1E1536' : '#120C22',
      border: hovered ? def.color : COLORS.railBorderBright,
      lip: 4,
      r: 12
    });

    drawPotionIcon(ctx, def.id, px + cardW / 2, cy + 44, 24, state.time);

    ctx.textAlign = 'center';
    ctx.font = '800 15px ui-sans-serif, system-ui, sans-serif';
    ctx.fillStyle = def.color;
    ctx.fillText(def.name, px + cardW / 2, cy + 80);

    ctx.font = '600 12px ui-sans-serif, system-ui, sans-serif';
    ctx.fillStyle = '#EDE9FE';
    const lines = wrapLines(ctx, def.desc, cardW - 24);
    lines.forEach((ln, li) => {
      ctx.fillText(ln, px + cardW / 2, cy + 104 + li * 16);
    });

    registerButton(ctx, state, `pick_potion_${idx}`, px + 24, cy + cardH - 42, cardW - 48, 30,
      full ? `BELT FULL (${maxSlots}/${maxSlots})` : 'TAKE POTION', {
        fill: full ? COLORS.railPanel : '#0F766E',
        hoverFill: '#0D9488',
        border: full ? COLORS.railBorder : '#5EEAD4',
        fontSize: 12,
        lip: 2,
        disabled: full,
        onClick: () => pickPotionReward(idx)
      });
  });

  registerButton(ctx, state, 'skip_potion_pick', x + w / 2 - 120, y + h - 54, 240, 38, 'SKIP → ENTER BAZAAR', {
    fill: COLORS.railPanel,
    hoverFill: '#2D224A',
    border: COLORS.brass,
    fontSize: 13,
    onClick: () => { sfx.click(); enterShop(); }
  });
}

// ============================================================================
// ARTEFACTS TRAY (TOP-LEFT, MIRRORS POTION TRAY), TOOLTIP & BOSS PICKER
// ============================================================================
export function drawArtefactTray(ctx, state, uiCtx) {
  const maxSlots = uiCtx && uiCtx.getMaxArtefactSlots ? uiCtx.getMaxArtefactSlots() : 3;
  const x = 16, y = 104, w = 220, h = 68;

  drawBevelPanel(ctx, x, y, w, h, {
    fill: 'rgba(18, 12, 32, 0.90)',
    border: state.artefacts.length > 0 ? COLORS.brass : COLORS.railBorderBright,
    lip: 3,
    r: 10
  });

  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';
  ctx.font = '800 10px ui-monospace, SFMono-Regular, Menlo, monospace';
  ctx.fillStyle = COLORS.brassBright;
  ctx.fillText(`ARTEFACTS (${state.artefacts.length}/${maxSlots})`, x + 10, y + 6);

  const slots = Math.max(maxSlots, state.artefacts.length);
  const gap = 5;
  const slotW = Math.floor((w - 20 - (slots - 1) * gap) / slots);
  const slotH = 40;
  const startX = x + 10;
  const sy = y + 21;

  for (let i = 0; i < slots; i++) {
    const sx = startX + i * (slotW + gap);
    const artId = state.artefacts[i] || null;
    const def = artId ? ARTEFACT_BY_ID[artId] : null;
    const rect = { x: sx, y: sy, w: slotW, h: slotH };
    const hovered = def && !state.modal && hitTest(state.mouseX, state.mouseY, rect);

    if (hovered) {
      state.hoveredArtefact = { def, idx: i, rect };
    }

    drawBevelPanel(ctx, sx, sy, slotW, slotH, {
      fill: def ? (hovered ? '#1E1636' : '#120D22') : 'rgba(9, 6, 18, 0.65)',
      border: def ? (hovered ? def.color : COLORS.railBorderBright) : '#261D40',
      lip: def ? 2 : 0,
      r: 7
    });

    if (def) {
      drawArtefactIcon(ctx, def.id, sx + slotW / 2, sy + slotH / 2 + 1, Math.min(15, slotW * 0.34), state.time);
    }
  }
}

export function drawArtefactTooltip(ctx, state, uiCtx) {
  const ha = state.hoveredArtefact;
  if (!ha || state.modal) return;
  const { LOGICAL_W, LOGICAL_H } = uiCtx;
  const { def, rect } = ha;

  const tipW = 272;
  ctx.font = '600 12.5px ui-sans-serif, system-ui, sans-serif';
  const descLines = wrapLines(ctx, def.desc, tipW - 26);
  const tipH = 68 + descLines.length * 17;

  const tx = clamp(rect.x + rect.w / 2 - tipW / 2, 18, LOGICAL_W - tipW - 18);
  const ty = clamp(rect.y + rect.h + 10, 14, LOGICAL_H - tipH - 14);

  drawBevelPanel(ctx, tx, ty, tipW, tipH, {
    fill: 'rgba(14, 10, 26, 0.97)',
    border: def.color,
    lip: 4,
    r: 10,
    glow: 'rgba(0,0,0,0.65)'
  });

  let curY = ty + 12;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';
  ctx.font = '800 14px ui-sans-serif, system-ui, sans-serif';
  ctx.fillStyle = COLORS.textMain;
  ctx.fillText(def.name, tx + 13, curY);

  ctx.textAlign = 'right';
  ctx.font = '800 10.5px ui-monospace, SFMono-Regular, Menlo, monospace';
  ctx.fillStyle = def.color;
  ctx.fillText(def.short, tx + tipW - 13, curY + 2);

  curY += 24;
  ctx.textAlign = 'left';
  ctx.font = '600 12.5px ui-sans-serif, system-ui, sans-serif';
  ctx.fillStyle = '#EDE9FE';
  for (const line of descLines) {
    ctx.fillText(line, tx + 13, curY);
    curY += 17;
  }
}

export function drawArtefactPickScreen(ctx, state, uiCtx) {
  const { pickArtefactReward, enterShop, getMaxArtefactSlots } = uiCtx;
  const maxSlots = getMaxArtefactSlots ? getMaxArtefactSlots() : 3;
  const full = state.artefacts.length >= maxSlots;
  const w = 780, h = 364;
  const x = (1280 - w) / 2, y = 180;

  drawBevelPanel(ctx, x, y, w, h, {
    fill: 'rgba(18, 12, 32, 0.95)',
    border: '#FB7185',
    lip: 6,
    r: 14,
    glow: 'rgba(251, 113, 133, 0.25)'
  });

  ctx.textAlign = 'center';
  ctx.textBaseline = 'top';
  ctx.font = '900 24px ui-sans-serif, system-ui, sans-serif';
  ctx.fillStyle = '#FDE047';
  ctx.fillText('BOSS DEFEATED — CHOOSE AN ARTEFACT', x + w / 2, y + 20);

  ctx.font = '600 13px ui-sans-serif, system-ui, sans-serif';
  ctx.fillStyle = COLORS.textMuted;
  ctx.fillText('Artefacts grant permanent run-wide powers (some carry a trade-off). Pick 1 of 3:', x + w / 2, y + 52);

  const choices = state.artefactChoices || [];
  const cardW = 216, cardH = 206, gap = 22;
  const startX = x + (w - (choices.length * cardW + (choices.length - 1) * gap)) / 2;
  const cy = y + 86;

  choices.forEach((artId, idx) => {
    const def = ARTEFACT_BY_ID[artId];
    if (!def) return;
    const px = startX + idx * (cardW + gap);
    const hovered = hitTest(state.mouseX, state.mouseY, { x: px, y: cy, w: cardW, h: cardH });

    drawBevelPanel(ctx, px, cy, cardW, cardH, {
      fill: hovered ? '#1E1536' : '#120C22',
      border: hovered ? def.color : COLORS.railBorderBright,
      lip: 4,
      r: 12
    });

    drawArtefactIcon(ctx, def.id, px + cardW / 2, cy + 44, 24, state.time);

    ctx.textAlign = 'center';
    ctx.font = '800 15px ui-sans-serif, system-ui, sans-serif';
    ctx.fillStyle = def.color;
    ctx.fillText(def.name, px + cardW / 2, cy + 80);

    ctx.font = '600 12px ui-sans-serif, system-ui, sans-serif';
    ctx.fillStyle = '#EDE9FE';
    const lines = wrapLines(ctx, def.desc, cardW - 24);
    lines.forEach((ln, li) => {
      ctx.fillText(ln, px + cardW / 2, cy + 104 + li * 16);
    });

    registerButton(ctx, state, `pick_artefact_${idx}`, px + 24, cy + cardH - 42, cardW - 48, 30,
      full ? `SLOTS FULL (${maxSlots}/${maxSlots})` : 'CLAIM ARTEFACT', {
        fill: full ? COLORS.railPanel : '#9F1239',
        hoverFill: '#BE123C',
        border: full ? COLORS.railBorder : '#FDA4AF',
        fontSize: 12,
        lip: 2,
        disabled: full,
        onClick: () => pickArtefactReward(idx)
      });
  });

  registerButton(ctx, state, 'skip_artefact_pick', x + w / 2 - 120, y + h - 54, 240, 38, 'SKIP → ENTER BAZAAR', {
    fill: COLORS.railPanel,
    hoverFill: '#2D224A',
    border: COLORS.brass,
    fontSize: 13,
    onClick: () => { sfx.click(); enterShop(); }
  });
}

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

export function getActiveCardLayout(state) {
  const trayX = 356;
  const trayW = 880;
  const count = state.activeCards.length;
  const cardW = count > 6 ? Math.max(92, Math.floor((trayW - (count - 1) * 10) / count)) : 128;
  const cardH = Math.round(cardW * 1.36);
  const gap = count > 6 ? 10 : 18;
  const totalW = count > 0 ? count * cardW + (count - 1) * gap : 0;
  const startX = trayX + (trayW - totalW) / 2;
  const centerY = 148;
  return { cardW, cardH, gap, startX, centerY, trayX, trayW };
}

export function getShopCardRects() {
  const cardW = 146;
  const cardH = 198;
  const gap = 58;
  const totalW = 3 * cardW + 2 * gap;
  const startX = 336 + (920 - totalW) / 2;
  const topY = 368;
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
    hoverFill = '#1D303E',
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
    r: 7,
    glow: hovered && opts.glow ? opts.glow : null
  });

  ctx.fillStyle = textColor;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = `800 ${fontSize}px ui-sans-serif, system-ui, sans-serif`;
  if (sublabel) {
    ctx.fillText(label, x + w / 2, y + pressY + h / 2 - 8);
    ctx.font = '600 11px ui-monospace, SFMono-Regular, Menlo, monospace';
    ctx.fillStyle = 'rgba(243,247,245,0.78)';
    ctx.fillText(sublabel, x + w / 2, y + pressY + h / 2 + 11);
  } else {
    ctx.fillText(label, x + w / 2, y + pressY + h / 2 + 0.5);
  }
  ctx.restore();
}

export function drawLeftHUD(ctx, state, uiCtx) {
  const { getStageLabel, isDieDebuffedByBoss, MAX_INTEREST } = uiCtx;
  const x = 24, y = 24, w = 288, h = 712;
  drawBevelPanel(ctx, x, y, w, h, {
    fill: COLORS.railBg,
    border: COLORS.railBorder,
    lip: 5,
    r: 10
  });

  // 1. Stage & Blind Plate
  const isBoss = Boolean(state.activeBoss);
  const blindLabel = getStageLabel(state.stage);
  const stageStr = state.endless ? `ENDLESS ${state.stage}` : `STAGE ${state.stage} / 9`;

  drawBevelPanel(ctx, x + 14, y + 14, w - 28, isBoss ? 140 : 108, {
    fill: isBoss ? '#221218' : '#14232E',
    border: isBoss ? COLORS.multRed : COLORS.railBorderBright,
    lip: 3,
    r: 7
  });

  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';
  ctx.font = '800 12px ui-monospace, SFMono-Regular, Menlo, monospace';
  ctx.fillStyle = isBoss ? COLORS.multLight : COLORS.brassBright;
  ctx.fillText(blindLabel, x + 28, y + 26);

  ctx.textAlign = 'right';
  ctx.fillStyle = COLORS.textMuted;
  ctx.fillText(stageStr, x + w - 28, y + 26);

  ctx.textAlign = 'center';
  ctx.font = '700 11px ui-sans-serif, system-ui, sans-serif';
  ctx.fillStyle = COLORS.textMuted;
  ctx.fillText('TARGET SCORE', x + w / 2, y + 52);

  ctx.font = '900 32px ui-monospace, SFMono-Regular, Menlo, monospace';
  ctx.fillStyle = COLORS.goldLight;
  ctx.fillText(fmtNum(state.targetScore), x + w / 2, y + 70);

  if (isBoss) {
    ctx.fillStyle = 'rgba(220, 38, 38, 0.24)';
    ctx.fillRect(x + 22, y + 109, w - 44, 38);
    ctx.font = '800 10.5px ui-monospace, SFMono-Regular, Menlo, monospace';
    ctx.fillStyle = '#FCA5A5';
    ctx.fillText(state.activeBoss.name.toUpperCase(), x + w / 2, y + 114);
    ctx.font = '700 11.5px ui-sans-serif, system-ui, sans-serif';
    ctx.fillStyle = '#FFF1F2';
    ctx.fillText(state.activeBoss.short, x + w / 2, y + 129);
  }

  // 2. Round Score Progress Block
  const scY = isBoss ? y + 166 : y + 136;
  drawBevelPanel(ctx, x + 14, scY, w - 28, 94, {
    fill: '#101B23',
    border: state.stageScore >= state.targetScore ? COLORS.emerald : COLORS.railBorder,
    lip: 3,
    r: 7
  });

  ctx.textAlign = 'center';
  ctx.font = '700 11px ui-sans-serif, system-ui, sans-serif';
  ctx.fillStyle = COLORS.textMuted;
  ctx.fillText('STAGE SCORE', x + w / 2, scY + 12);

  ctx.font = '900 34px ui-monospace, SFMono-Regular, Menlo, monospace';
  ctx.fillStyle = state.stageScore >= state.targetScore ? '#6EE7B7' : COLORS.textMain;
  ctx.fillText(fmtNum(state.displayScore), x + w / 2, scY + 30);

  // Progress bar
  const barX = x + 28, barY = scY + 72, barW = w - 56, barH = 10;
  ctx.fillStyle = '#091117';
  ctx.fillRect(barX, barY, barW, barH);
  const pct = clamp(state.displayScore / Math.max(1, state.targetScore), 0, 1);
  if (pct > 0) {
    ctx.fillStyle = pct >= 1 ? COLORS.emerald : COLORS.brass;
    ctx.fillRect(barX, barY, barW * pct, barH);
  }
  ctx.strokeStyle = COLORS.railBorder;
  ctx.lineWidth = 1;
  ctx.strokeRect(barX + 0.5, barY + 0.5, barW - 1, barH - 1);

  // 3. Live Hand Preview & Chips x Mult
  const cmY = scY + 106;
  drawBevelPanel(ctx, x + 14, cmY, w - 28, 128, {
    fill: '#111D26',
    border: COLORS.railBorder,
    lip: 3,
    r: 7
  });

  ctx.textAlign = 'center';
  ctx.font = '800 16px ui-sans-serif, system-ui, sans-serif';
  ctx.fillStyle = state.liveHandName ? COLORS.textMain : COLORS.textDim;
  ctx.fillText(state.liveHandName || 'Select 1–3 Dice', x + w / 2, cmY + 14);

  // Chips box
  const boxY = cmY + 42, boxW = 104, boxH = 54;
  drawBevelPanel(ctx, x + 26, boxY, boxW, boxH, {
    fill: COLORS.chipsBlue,
    border: COLORS.chipsLight,
    lip: 3,
    r: 6
  });
  ctx.font = '900 24px ui-monospace, SFMono-Regular, Menlo, monospace';
  ctx.fillStyle = '#FFFFFF';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(fmtNum(state.chips), x + 26 + boxW / 2, boxY + boxH / 2 + 1);

  // X operator
  ctx.font = '900 24px ui-sans-serif, system-ui, sans-serif';
  ctx.fillStyle = COLORS.multLight;
  ctx.fillText('×', x + w / 2, boxY + boxH / 2 + 1);

  // Mult box
  drawBevelPanel(ctx, x + w - 26 - boxW, boxY, boxW, boxH, {
    fill: COLORS.multRed,
    border: COLORS.multLight,
    lip: 3,
    r: 6
  });
  ctx.font = '900 24px ui-monospace, SFMono-Regular, Menlo, monospace';
  ctx.fillStyle = '#FFFFFF';
  ctx.fillText(fmtMult(state.mult), x + w - 26 - boxW / 2, boxY + boxH / 2 + 1);

  // Sub-caption under Chips x Mult
  ctx.textBaseline = 'top';
  ctx.font = '700 11px ui-monospace, SFMono-Regular, Menlo, monospace';
  if (state.mode === 'SCORING' && state.scoringHandTotal > 0) {
    ctx.fillStyle = COLORS.goldLight;
    ctx.fillText('HAND TOTAL: ' + fmtNum(state.scoringHandTotal), x + w / 2, cmY + 106);
  } else if (state.liveHandName) {
    const sel = state.dice.filter(d => d.selected);
    const pipSum = sel.reduce((a, d) => a + (isDieDebuffedByBoss(d.value) ? 0 : d.value), 0);
    ctx.fillStyle = COLORS.textMuted;
    ctx.fillText(`Base + ${pipSum} pip Chips before cards`, x + w / 2, cmY + 106);
  } else {
    ctx.fillStyle = COLORS.textDim;
    ctx.fillText('CHIPS  ×  MULT', x + w / 2, cmY + 106);
  }

  // 4. Resources (Hands, Rerolls, Bankroll)
  const resY = cmY + 140;
  const halfW = (w - 38) / 2;

  // Hands
  drawBevelPanel(ctx, x + 14, resY, halfW, 66, {
    fill: '#13202A', border: COLORS.railBorder, lip: 3, r: 7
  });
  ctx.textAlign = 'center';
  ctx.font = '700 11px ui-sans-serif, system-ui, sans-serif';
  ctx.fillStyle = COLORS.textMuted;
  ctx.fillText('HANDS', x + 14 + halfW / 2, resY + 10);
  ctx.font = '900 28px ui-monospace, SFMono-Regular, Menlo, monospace';
  ctx.fillStyle = state.handsLeft <= 1 ? COLORS.multLight : COLORS.chipsLight;
  ctx.fillText(String(state.handsLeft), x + 14 + halfW / 2, resY + 28);

  // Rerolls
  drawBevelPanel(ctx, x + 24 + halfW, resY, halfW, 66, {
    fill: '#13202A', border: COLORS.railBorder, lip: 3, r: 7
  });
  ctx.font = '700 11px ui-sans-serif, system-ui, sans-serif';
  ctx.fillStyle = COLORS.textMuted;
  ctx.fillText('REROLLS', x + 24 + halfW * 1.5, resY + 10);
  ctx.font = '900 28px ui-monospace, SFMono-Regular, Menlo, monospace';
  ctx.fillStyle = state.rerollsLeft === 0 ? COLORS.textDim : COLORS.brassBright;
  ctx.fillText(String(state.rerollsLeft), x + 24 + halfW * 1.5, resY + 28);

  // Bankroll + Interest indicator
  const monY = resY + 76;
  drawBevelPanel(ctx, x + 14, monY, w - 28, 66, {
    fill: '#1A1C14', border: '#66521E', lip: 3, r: 7
  });
  const nextInterest = Math.min(MAX_INTEREST, Math.floor(state.money / 5));
  ctx.textAlign = 'left';
  ctx.font = '700 11px ui-sans-serif, system-ui, sans-serif';
  ctx.fillStyle = COLORS.textMuted;
  ctx.fillText('BANKROLL', x + 28, monY + 11);
  ctx.font = '900 28px ui-monospace, SFMono-Regular, Menlo, monospace';
  ctx.fillStyle = COLORS.goldLight;
  ctx.fillText('$' + state.money, x + 28, monY + 28);

  ctx.textAlign = 'right';
  ctx.font = '700 11px ui-monospace, SFMono-Regular, Menlo, monospace';
  ctx.fillStyle = nextInterest > 0 ? '#86EFAC' : COLORS.textDim;
  ctx.fillText('INTEREST +$' + nextInterest, x + w - 28, monY + 22);
  ctx.font = '600 10px ui-sans-serif, system-ui, sans-serif';
  ctx.fillStyle = COLORS.textMuted;
  ctx.fillText('$1 per $5 (max $5)', x + w - 28, monY + 40);

  // 5. Utility Controls (2x2 Grid pinned neatly at bottom of rail)
  const utilY = y + h - 102;
  const btnW = (w - 38) / 2;
  const btnH = 38;
  registerButton(ctx, state, 'hud_guide', x + 14, utilY, btnW, btnH, 'HAND GUIDE', {
    fill: '#162632', hoverFill: '#1F3546', fontSize: 12,
    onClick: () => { sfx.click(); state.modal = state.modal === 'GUIDE' ? null : 'GUIDE'; }
  });
  registerButton(ctx, state, 'hud_crt', x + 24 + btnW, utilY, btnW, btnH, state.crtEnabled ? 'CRT: ON' : 'CRT: OFF', {
    fill: state.crtEnabled ? '#17312A' : '#162632',
    hoverFill: '#214038',
    border: state.crtEnabled ? COLORS.emerald : COLORS.railBorderBright,
    fontSize: 12,
    onClick: () => { sfx.click(); state.crtEnabled = !state.crtEnabled; }
  });
  registerButton(ctx, state, 'hud_sfx', x + 14, utilY + 46, btnW, btnH, sfx.muted ? 'SFX: OFF' : 'SFX: ON', {
    fill: '#162632', hoverFill: '#1F3546', fontSize: 12,
    onClick: () => { sfx.muted = !sfx.muted; if (!sfx.muted) sfx.click(); }
  });
  registerButton(ctx, state, 'hud_pause', x + 24 + btnW, utilY + 46, btnW, btnH, 'MENU', {
    fill: '#162632', hoverFill: '#1F3546', fontSize: 12,
    onClick: () => { sfx.click(); state.modal = state.modal === 'PAUSE' ? null : 'PAUSE'; }
  });
}

export function drawModifierCardTray(ctx, state, uiCtx) {
  const {
    getUsedCardSlots,
    getMaxCardSlots,
    BASE_MAX_SLOTS,
    isCardDebuffedByBoss,
    moveActiveCard,
    sellActiveCard
  } = uiCtx;

  const x = 336, y = 24, w = 920, h = 238;
  drawBevelPanel(ctx, x, y, w, h, {
    fill: 'rgba(6, 22, 16, 0.78)',
    border: 'rgba(217, 164, 65, 0.28)',
    lip: 4,
    r: 10
  });

  const usedSlots = getUsedCardSlots();
  const maxSlots = getMaxCardSlots();
  const negBonus = maxSlots - BASE_MAX_SLOTS;

  // Quiet unboxed header metadata
  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';
  ctx.font = '800 12px ui-monospace, SFMono-Regular, Menlo, monospace';
  ctx.fillStyle = COLORS.brassBright;
  ctx.fillText('MODIFIER CARDS', x + 18, y + 12);

  ctx.fillStyle = COLORS.textMuted;
  ctx.font = '700 12px ui-monospace, SFMono-Regular, Menlo, monospace';
  const slotLabel = negBonus > 0
    ? `·  ${state.activeCards.length} / ${maxSlots} SLOTS (+${negBonus} Negative)`
    : `·  ${usedSlots} / ${BASE_MAX_SLOTS} SLOTS`;
  ctx.fillText(slotLabel, x + 144, y + 12);

  ctx.textAlign = 'right';
  ctx.font = '600 11.5px ui-sans-serif, system-ui, sans-serif';
  ctx.fillStyle = 'rgba(186, 212, 198, 0.65)';
  ctx.fillText('Triggers left → right · Drag or click card to reorder / sell', x + w - 18, y + 12);

  // Draw empty slot outlines when fewer than 5 cards
  const layout = getActiveCardLayout(state);
  if (state.activeCards.length === 0) {
    const emptyW = 114, emptyH = 156, gap = 22;
    const tot = 5 * emptyW + 4 * gap;
    const sx = x + (w - tot) / 2;
    for (let i = 0; i < 5; i++) {
      tracePixelRect(ctx, sx + i * (emptyW + gap), y + 48, emptyW, emptyH, 8);
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
      ctx.lineWidth = 2;
      ctx.setLineDash([6, 6]);
      ctx.stroke();
      ctx.setLineDash([]);
    }
    ctx.textAlign = 'center';
    ctx.font = '600 14px ui-sans-serif, system-ui, sans-serif';
    ctx.fillStyle = 'rgba(195, 222, 208, 0.45)';
    ctx.fillText('Beat Stage 1 to visit the Shop and draft Playing Card modifiers', x + w / 2, y + 122);
    return;
  }

  // Update target positions and draw non-dragged cards first
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

    // Render precision controls (◀ | SELL | ▶) when focused or hovered in PLAYING/SHOP
    if (canManage && isFocused) {
      const barY = card.y + layout.cardH / 2 + 6;
      const bw = Math.max(122, layout.cardW + 6);
      const bx = card.x - bw / 2;
      registerButton(ctx, state, `card_left_${card.uid}`, bx, barY, 28, 24, '◀', {
        fill: '#172936', hoverFill: '#244054', fontSize: 11, lip: 2,
        disabled: idx === 0,
        onClick: () => moveActiveCard(idx, -1)
      });
      registerButton(ctx, state, `card_sell_${card.uid}`, bx + 31, barY, bw - 62, 24, `SELL $${card.sellValue}`, {
        fill: '#5C1E24', hoverFill: '#8B2630', border: '#F87171', fontSize: 10.5, lip: 2,
        onClick: () => sellActiveCard(idx)
      });
      registerButton(ctx, state, `card_right_${card.uid}`, bx + bw - 28, barY, 28, 24, '▶', {
        fill: '#172936', hoverFill: '#244054', fontSize: 11, lip: 2,
        disabled: idx === state.activeCards.length - 1,
        onClick: () => moveActiveCard(idx, 1)
      });
    }
  });

  // Draw dragged card on top
  if (draggedEntry) {
    drawPlayingCard(ctx, state, draggedEntry.card, state.drag.curX, state.drag.curY, layout.cardW, layout.cardH, {
      debuffed: isCardDebuffedByBoss(draggedEntry.idx),
      hovered: true,
      dragging: true,
      tilt: clamp((state.drag.curX - draggedEntry.card.x) * 0.004, -0.18, 0.18)
    });
  }
}

export function drawPlayArena(ctx, state, uiCtx) {
  const {
    isDieDebuffedByBoss,
    isAnyDieTumbling,
    playSelectedHand,
    triggerReroll,
    clearSelectedDice
  } = uiCtx;

  // Contextual status / scoring cascade banner
  const cx = 796;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  if (state.mode === 'SCORING' && state.scoringBanner) {
    drawBevelPanel(ctx, 446, 284, 700, 42, {
      fill: 'rgba(14, 23, 30, 0.92)',
      border: COLORS.brass,
      lip: 3,
      r: 7
    });
    ctx.font = '800 16px ui-monospace, SFMono-Regular, Menlo, monospace';
    ctx.fillStyle = COLORS.goldLight;
    ctx.fillText(state.scoringBanner, cx, 305);
  } else if (state.noticeTimer > 0 && state.noticeText) {
    drawBevelPanel(ctx, 446, 284, 700, 42, {
      fill: 'rgba(42, 18, 22, 0.92)',
      border: COLORS.multLight,
      lip: 3,
      r: 7
    });
    ctx.font = '700 14px ui-sans-serif, system-ui, sans-serif';
    ctx.fillStyle = '#FECACA';
    ctx.fillText(state.noticeText, cx, 305);
  } else {
    ctx.font = '600 14px ui-sans-serif, system-ui, sans-serif';
    ctx.fillStyle = 'rgba(202, 228, 215, 0.68)';
    ctx.fillText('Click 1–3 dice to form a hand · Reroll tumbles unselected dice', cx, 305);
  }

  // Subtle recessed dice lane
  tracePixelRect(ctx, 366, 368, 860, 214, 14);
  ctx.fillStyle = 'rgba(4, 18, 13, 0.34)';
  ctx.fill();
  ctx.strokeStyle = 'rgba(217, 164, 65, 0.14)';
  ctx.lineWidth = 1.5;
  ctx.stroke();

  // Draw all 5 dice
  for (const d of state.dice) {
    drawDie(ctx, state, d, false, isDieDebuffedByBoss(d.value));
  }

  // Primary Action Controls
  const selectedCount = state.dice.filter(d => d.selected).length;
  const unselectedCount = state.dice.length - selectedCount;
  const locked = state.mode !== 'PLAYING' || Boolean(state.modal) || isAnyDieTumbling();
  const minDiceNeeded = (state.activeBoss && state.activeBoss.id === 'MIN_TWO_DICE') ? 2 : 1;

  const btnY = 636;
  registerButton(ctx, state, 'btn_play', 446, btnY, 260, 66, 'PLAY HAND', {
    fill: '#15803D',
    hoverFill: '#16A34A',
    border: '#4ADE80',
    fontSize: 19,
    sublabel: selectedCount >= minDiceNeeded ? `${state.liveHandName}  [Space]` : `Select ${minDiceNeeded}–3 Dice`,
    glow: 'rgba(74, 222, 128, 0.35)',
    disabled: locked || selectedCount < minDiceNeeded,
    onClick: playSelectedHand
  });

  const rerollLabel = selectedCount === 0
    ? `REROLL ALL (${state.rerollsLeft})`
    : `REROLL ${unselectedCount} (${state.rerollsLeft})`;
  registerButton(ctx, state, 'btn_reroll', 724, btnY, 260, 66, rerollLabel, {
    fill: '#B45309',
    hoverFill: '#D97706',
    border: '#FCD34D',
    fontSize: 18,
    sublabel: selectedCount > 0 ? `Keep ${selectedCount} selected  [R]` : 'Tumble all 5 dice  [R]',
    glow: 'rgba(252, 211, 77, 0.3)',
    disabled: locked || state.rerollsLeft <= 0 || unselectedCount === 0,
    onClick: triggerReroll
  });

  registerButton(ctx, state, 'btn_clear', 1002, btnY, 138, 66, 'CLEAR', {
    fill: '#182834',
    hoverFill: '#243B4D',
    border: COLORS.railBorderBright,
    fontSize: 15,
    sublabel: '[C]',
    disabled: locked || selectedCount === 0,
    onClick: clearSelectedDice
  });
}

export function drawCashOutPanel(ctx, state, uiCtx) {
  const { getStageLabel, claimCashOut } = uiCtx;
  const d = state.cashOutData;
  if (!d) return;
  const x = 496, y = 294, w = 600, h = 412;
  drawBevelPanel(ctx, x, y, w, h, {
    fill: '#101B22',
    border: COLORS.brassBright,
    lip: 6,
    r: 12,
    glow: 'rgba(246, 202, 101, 0.25)'
  });

  ctx.textAlign = 'center';
  ctx.textBaseline = 'top';
  ctx.font = '900 28px ui-sans-serif, system-ui, sans-serif';
  ctx.fillStyle = '#6EE7B7';
  ctx.fillText(d.isRunVictory ? 'STAGE 9 BOSS DEFEATED!' : `STAGE ${state.stage} CLEARED!`, x + w / 2, y + 26);

  ctx.font = '600 13px ui-monospace, SFMono-Regular, Menlo, monospace';
  ctx.fillStyle = COLORS.textMuted;
  ctx.fillText(`Score ${fmtNum(state.stageScore)}  /  Target ${fmtNum(state.targetScore)}`, x + w / 2, y + 64);

  // Ledger rows
  const rows = [
    { label: `${getStageLabel(state.stage)} Clear Bonus`, val: `+$${d.baseReward}`, show: state.cashOutReveal >= 0.15 },
    { label: `Remaining Hands (${d.handsCount} × $1)`, val: `+$${d.handsBonus}`, show: state.cashOutReveal >= 0.45 },
    { label: `Interest ($1 per $5 saved, max $5)`, val: `+$${d.interest}`, show: state.cashOutReveal >= 0.75 }
  ];

  let ry = y + 114;
  for (const row of rows) {
    if (row.show) {
      ctx.textAlign = 'left';
      ctx.font = '600 16px ui-sans-serif, system-ui, sans-serif';
      ctx.fillStyle = COLORS.textMain;
      ctx.fillText(row.label, x + 48, ry);
      ctx.textAlign = 'right';
      ctx.font = '800 19px ui-monospace, SFMono-Regular, Menlo, monospace';
      ctx.fillStyle = COLORS.goldLight;
      ctx.fillText(row.val, x + w - 48, ry - 2);
    }
    ry += 44;
  }

  // Divider
  ctx.strokeStyle = COLORS.railBorderBright;
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(x + 48, ry + 8);
  ctx.lineTo(x + w - 48, ry + 8);
  ctx.stroke();

  // Total
  ctx.textAlign = 'left';
  ctx.font = '800 18px ui-sans-serif, system-ui, sans-serif';
  ctx.fillStyle = COLORS.textMain;
  ctx.fillText('TOTAL PAYOUT', x + 48, ry + 26);
  ctx.textAlign = 'right';
  ctx.font = '900 28px ui-monospace, SFMono-Regular, Menlo, monospace';
  ctx.fillStyle = COLORS.goldLight;
  ctx.fillText(`+$${d.total}`, x + w - 48, ry + 20);

  registerButton(ctx, state, 'btn_cashout', x + 110, y + h - 84, w - 220, 58,
    d.isRunVictory ? 'CLAIM VICTORY' : 'CASH OUT → SHOP', {
      fill: '#D97706',
      hoverFill: '#F59E0B',
      border: '#FDE047',
      textColor: '#0B1318',
      fontSize: 18,
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

  const x = 336, y = 278, w = 920, h = 458;
  drawBevelPanel(ctx, x, y, w, h, {
    fill: 'rgba(13, 23, 30, 0.90)',
    border: COLORS.brass,
    lip: 5,
    r: 10
  });

  // Shop Header
  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';
  ctx.font = '900 24px ui-sans-serif, system-ui, sans-serif';
  ctx.fillStyle = COLORS.brassBright;
  ctx.fillText('CARD SHOP', x + 26, y + 18);

  const nextStage = state.stage + 1;
  const nextIsBoss = nextStage % 3 === 0;
  ctx.textAlign = 'right';
  ctx.font = '700 13px ui-monospace, SFMono-Regular, Menlo, monospace';
  ctx.fillStyle = nextIsBoss ? COLORS.multLight : COLORS.textMuted;
  ctx.fillText(
    `Next: Stage ${nextStage} (${getStageLabel(nextStage)}) · Target ${fmtNum(getStageTarget(nextStage))}`,
    x + w - 26,
    y + 24
  );

  if (state.noticeTimer > 0 && state.noticeText) {
    ctx.textAlign = 'center';
    ctx.font = '700 13px ui-sans-serif, system-ui, sans-serif';
    ctx.fillStyle = '#FECACA';
    ctx.fillText(state.noticeText, x + w / 2, y + 54);
  } else {
    ctx.textAlign = 'center';
    ctx.font = '600 13px ui-sans-serif, system-ui, sans-serif';
    ctx.fillStyle = COLORS.textMuted;
    ctx.fillText('Hover any card for trigger & edition details · Save $5 increments for Interest', x + w / 2, y + 54);
  }

  // 3 Showcase Cards
  const rects = getShopCardRects();
  const slotsFull = state.activeCards.length >= getMaxCardSlots();

  rects.forEach((r, idx) => {
    const card = state.shopCards[idx];

    // Pedestal backing
    tracePixelRect(ctx, r.x - 14, r.y - 12, r.w + 28, r.h + 76, 10);
    ctx.fillStyle = 'rgba(5, 13, 18, 0.65)';
    ctx.fill();
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    if (!card) {
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.font = '800 15px ui-monospace, SFMono-Regular, Menlo, monospace';
      ctx.fillStyle = COLORS.textDim;
      ctx.fillText('SOLD', r.x + r.w / 2, r.y + r.h / 2);
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
    let buyLabel = `BUY $${card.price}`;
    if (!canFit) buyLabel = 'SLOTS FULL';
    else if (isNeg) buyLabel = `BUY $${card.price} (+1)`;

    registerButton(ctx, state, `shop_buy_${idx}`, r.x - 4, r.y + r.h + 14, r.w + 8, 40, buyLabel, {
      fill: buyDisabled ? '#1B252E' : '#15803D',
      hoverFill: '#16A34A',
      border: buyDisabled ? COLORS.railBorder : '#4ADE80',
      fontSize: 14,
      disabled: buyDisabled,
      onClick: () => buyShopCard(idx)
    });
  });

  // Bottom Shop Action Bar
  const actY = y + h - 76;
  registerButton(ctx, state, 'shop_reroll', x + 150, actY, 260, 56, `REROLL SHOP ($${SHOP_REROLL_COST})`, {
    fill: '#B45309',
    hoverFill: '#D97706',
    border: '#FCD34D',
    fontSize: 16,
    sublabel: 'Fresh 3 cards  [R]',
    disabled: state.money < SHOP_REROLL_COST || Boolean(state.modal),
    onClick: rerollShop
  });

  registerButton(ctx, state, 'shop_next', x + w - 410, actY, 260, 56, `NEXT STAGE (${nextStage}) ▸`, {
    fill: '#2563EB',
    hoverFill: '#3B82F6',
    border: '#93C5FD',
    fontSize: 17,
    sublabel: `${getStageLabel(nextStage)}  [Space]`,
    glow: 'rgba(96, 165, 250, 0.35)',
    disabled: Boolean(state.modal),
    onClick: () => startStage(nextStage)
  });
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
  tipH += 24; // Footer sell/price line

  let tx = rect.x + rect.w / 2 - tipW / 2;
  tx = clamp(tx, 336, LOGICAL_W - tipW - 18);
  // Position below active tray cards, or above shop cards
  let ty = zone === 'active' ? rect.y + rect.h + 38 : rect.y - tipH - 16;
  if (ty + tipH > LOGICAL_H - 14) ty = rect.y - tipH - 12;
  if (ty < 14) ty = 14;

  drawBevelPanel(ctx, tx, ty, tipW, tipH, {
    fill: 'rgba(10, 17, 24, 0.97)',
    border: card.edition !== 'standard' ? ed.color : COLORS.brassBright,
    lip: 4,
    r: 8,
    glow: 'rgba(0,0,0,0.6)'
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
  ctx.fillStyle = '#E2ECE7';
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
    ctx.fillText('DISABLED BY BOSS (Drag right to restore)', tx + 14, curY);
    curY += 20;
  }

  curY += 6;
  ctx.font = '600 11px ui-monospace, SFMono-Regular, Menlo, monospace';
  ctx.fillStyle = COLORS.textMuted;
  if (zone === 'active') {
    ctx.fillText(`Sell Value: $${card.sellValue} · Click card for controls`, tx + 14, curY);
  } else {
    ctx.fillText(`Shop Price: $${card.price} · Sell Value: $${card.sellValue}`, tx + 14, curY);
  }
}

export function drawTitleScreen(ctx, state, uiCtx) {
  const { startNewRun, LOGICAL_W } = uiCtx;

  // Live atmospheric dice gently bobbing on felt flanks
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

  // Fan of shimmering signature modifier cards
  const fanCx = LOGICAL_W / 2;
  const fanCy = 468;
  state.titleCards.forEach((c, i) => {
    const offset = i - 2;
    const angle = offset * 0.14 + Math.sin(state.time * 1.1 + i) * 0.015;
    const cx = fanCx + offset * 92;
    const cy = fanCy + Math.abs(offset) * 16 + Math.sin(state.time * 1.8 + i * 0.7) * 5;
    drawPlayingCard(ctx, state, c, cx, cy, 114, 156, { tilt: angle });
  });

  // Bespoke retro-modern pixel-vector title lockup
  const titleY = 178;
  ctx.save();
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  // Brass decorative rule & suit emblem
  drawSuitIcon(ctx, 'spades', fanCx - 220, titleY - 56, 11, COLORS.brass);
  drawSuitIcon(ctx, 'hearts', fanCx - 192, titleY - 56, 11, COLORS.suitHearts);
  drawSuitIcon(ctx, 'diamonds', fanCx + 192, titleY - 56, 11, COLORS.suitDiamonds);
  drawSuitIcon(ctx, 'clubs', fanCx + 220, titleY - 56, 11, COLORS.emerald);

  ctx.font = '800 13px ui-monospace, SFMono-Regular, Menlo, monospace';
  ctx.fillStyle = COLORS.brassBright;
  ctx.fillText('ROGUELIKE DICE & CARD DECKBUILDER', fanCx, titleY - 56);

  // Layered phosphor shadow + gold/ivory title
  ctx.font = '900 84px ui-sans-serif, system-ui, sans-serif';
  ctx.fillStyle = '#04120D';
  ctx.fillText('VELVET ROLL', fanCx + 5, titleY + 7);
  ctx.fillStyle = COLORS.brass;
  ctx.fillText('VELVET ROLL', fanCx + 2, titleY + 3);
  ctx.shadowColor = 'rgba(246, 202, 101, 0.35)';
  ctx.shadowBlur = 24;
  ctx.fillStyle = '#FFFDF7';
  ctx.fillText('VELVET ROLL', fanCx, titleY);
  ctx.restore();

  // Subtitle
  ctx.textAlign = 'center';
  ctx.font = '600 16px ui-sans-serif, system-ui, sans-serif';
  ctx.fillStyle = '#C7DFD3';
  ctx.fillText('Sculpt 3-dice combos · Stack 18 card modifiers across 5 editions · Beat 9 stages + Endless', fanCx, 250);

  // Primary CTA
  registerButton(ctx, state, 'title_play', fanCx - 140, 286, 280, 62, 'PLAY RUN', {
    fill: '#15803D',
    hoverFill: '#16A34A',
    border: '#4ADE80',
    fontSize: 22,
    sublabel: 'Press Enter or Space',
    glow: 'rgba(74, 222, 128, 0.4)',
    onClick: startNewRun
  });

  // Compact secondary utility row
  registerButton(ctx, state, 'title_guide', fanCx - 175, 594, 165, 42, 'HANDS & RULES', {
    fill: '#13222C', hoverFill: '#1D3342', fontSize: 13,
    onClick: () => { sfx.click(); state.modal = 'GUIDE'; }
  });
  registerButton(ctx, state, 'title_crt', fanCx + 10, 594, 165, 42, state.crtEnabled ? 'CRT GLOW: ON' : 'CRT GLOW: OFF', {
    fill: '#13222C', hoverFill: '#1D3342', fontSize: 13,
    onClick: () => { sfx.click(); state.crtEnabled = !state.crtEnabled; }
  });

  // Clean unboxed local stats if available
  if (state.stats.bestHand > 0 || state.stats.wins > 0) {
    ctx.font = '700 13px ui-monospace, SFMono-Regular, Menlo, monospace';
    ctx.fillStyle = COLORS.brassBright;
    ctx.fillText(
      `Best Hand: ${fmtNum(state.stats.bestHand)}   ·   Best Stage: ${state.stats.bestStage}   ·   Runs Won: ${state.stats.wins}`,
      fanCx,
      664
    );
  }

  // Single flat control-hint line
  ctx.font = '600 12.5px ui-monospace, SFMono-Regular, Menlo, monospace';
  ctx.fillStyle = 'rgba(182, 212, 198, 0.58)';
  ctx.fillText('Click Dice (1–5) · Space Play Hand · R Reroll · Drag Cards to Reorder · Esc Pause', fanCx, 718);
}

export function drawEndModal(ctx, state, isVictory, uiCtx) {
  const { startNewRun, enterShop, LOGICAL_W, LOGICAL_H } = uiCtx;

  state.buttons = [];
  state.hoverButtonId = null;
  state.hoveredCard = null;
  ctx.fillStyle = 'rgba(3, 10, 8, 0.78)';
  ctx.fillRect(0, 0, LOGICAL_W, LOGICAL_H);

  const w = 560, h = 420;
  const x = (LOGICAL_W - w) / 2;
  const y = (LOGICAL_H - h) / 2;
  drawBevelPanel(ctx, x, y, w, h, {
    fill: '#0F1A22',
    border: isVictory ? COLORS.brassBright : COLORS.multRed,
    lip: 6,
    r: 12,
    glow: isVictory ? 'rgba(246, 202, 101, 0.3)' : 'rgba(220, 38, 38, 0.3)'
  });

  ctx.textAlign = 'center';
  ctx.textBaseline = 'top';
  ctx.font = '900 36px ui-sans-serif, system-ui, sans-serif';
  ctx.fillStyle = isVictory ? COLORS.goldLight : COLORS.multLight;
  ctx.fillText(isVictory ? 'RUN VICTORY!' : 'OUT OF HANDS', x + w / 2, y + 32);

  ctx.font = '600 15px ui-sans-serif, system-ui, sans-serif';
  ctx.fillStyle = COLORS.textMuted;
  ctx.fillText(
    isVictory
      ? 'You conquered all 9 stages and 3 Boss Blinds!'
      : `Stopped at Stage ${state.stage} (${fmtNum(state.stageScore)} / ${fmtNum(state.targetScore)})`,
    x + w / 2,
    y + 82
  );

  // Run stats summary
  const rows = [
    ['Stage Reached', state.endless ? `Endless ${state.stage}` : `${state.stage} / 9`],
    ['Best Single Hand', fmtNum(state.bestHandScore)],
    ['Hands Played', String(state.handsPlayedRun)],
    ['Total Money Earned', '$' + state.totalMoneyEarned],
    ['Final Modifier Cards', String(state.activeCards.length)]
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
      fill: '#7C3AED', hoverFill: '#8B5CF6', border: '#C4B5FD', fontSize: 15,
      onClick: () => {
        sfx.buyCard();
        state.endless = true;
        enterShop();
      }
    });
    registerButton(ctx, state, 'end_new', x + w - 272, y + h - 84, 228, 54, 'NEW RUN', {
      fill: '#15803D', hoverFill: '#16A34A', border: '#4ADE80', fontSize: 16,
      onClick: startNewRun
    });
  } else {
    registerButton(ctx, state, 'end_retry', x + 70, y + h - 84, 200, 54, 'PLAY AGAIN', {
      fill: '#15803D', hoverFill: '#16A34A', border: '#4ADE80', fontSize: 16,
      onClick: startNewRun
    });
    registerButton(ctx, state, 'end_title', x + w - 270, y + h - 84, 200, 54, 'TITLE SCREEN', {
      fill: '#182936', hoverFill: '#243B4D', fontSize: 15,
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
  ctx.fillStyle = 'rgba(3, 10, 8, 0.78)';
  ctx.fillRect(0, 0, LOGICAL_W, LOGICAL_H);

  if (state.modal === 'PAUSE') {
    const w = 420, h = 330;
    const x = (LOGICAL_W - w) / 2, y = (LOGICAL_H - h) / 2;
    drawBevelPanel(ctx, x, y, w, h, {
      fill: '#0F1A22', border: COLORS.brassBright, lip: 6, r: 12
    });
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    ctx.font = '900 26px ui-sans-serif, system-ui, sans-serif';
    ctx.fillStyle = COLORS.textMain;
    ctx.fillText('PAUSED', x + w / 2, y + 28);

    registerButton(ctx, state, 'pause_resume', x + 60, y + 88, w - 120, 48, 'RESUME RUN', {
      fill: '#15803D', hoverFill: '#16A34A', border: '#4ADE80', fontSize: 16,
      onClick: () => { sfx.click(); state.modal = null; }
    });
    registerButton(ctx, state, 'pause_restart', x + 60, y + 150, w - 120, 48, 'RESTART RUN', {
      fill: '#B45309', hoverFill: '#D97706', border: '#FCD34D', fontSize: 15,
      onClick: startNewRun
    });
    registerButton(ctx, state, 'pause_title', x + 60, y + 212, w - 120, 48, 'EXIT TO TITLE', {
      fill: '#1A2B38', hoverFill: '#253D4F', fontSize: 15,
      onClick: () => { sfx.click(); state.modal = null; state.mode = 'TITLE_MENU'; }
    });
    return;
  }

  if (state.modal === 'GUIDE') {
    const w = 820, h = 580;
    const x = (LOGICAL_W - w) / 2, y = (LOGICAL_H - h) / 2;
    drawBevelPanel(ctx, x, y, w, h, {
      fill: '#0F1A22', border: COLORS.brassBright, lip: 6, r: 12
    });

    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    ctx.font = '900 24px ui-sans-serif, system-ui, sans-serif';
    ctx.fillStyle = COLORS.brassBright;
    ctx.fillText('SCORING HANDS & EDITIONS', x + 32, y + 24);

    registerButton(ctx, state, 'guide_close', x + w - 124, y + 20, 92, 36, 'CLOSE', {
      fill: '#1A2B38', hoverFill: '#284154', fontSize: 13,
      onClick: () => { sfx.click(); state.modal = null; }
    });

    // Left column: 3-Dice Scoring Hands
    ctx.font = '800 13px ui-monospace, SFMono-Regular, Menlo, monospace';
    ctx.fillStyle = COLORS.textMuted;
    ctx.fillText('3-DICE HANDS (Each scored die adds its pips to Chips)', x + 32, y + 72);

    let hy = y + 100;
    for (const hid of HAND_ORDER.slice().reverse()) {
      const hd = HANDS[hid];
      drawBevelPanel(ctx, x + 32, hy, 420, 56, {
        fill: '#14232E', border: COLORS.railBorder, lip: 2, r: 6
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

    // Right column: Card Editions + Economy
    const rx = x + 480;
    ctx.textAlign = 'left';
    ctx.font = '800 13px ui-monospace, SFMono-Regular, Menlo, monospace';
    ctx.fillStyle = COLORS.textMuted;
    ctx.fillText('CARD EDITIONS (Rolled in Shop)', rx, y + 72);

    const edList = [
      ['Standard (80%)', 'Normal card behavior', '#CBD5E1'],
      ['Foil (8%)', '+50 Chips when triggered', '#60A5FA'],
      ['Holographic (7%)', '+12 Mult when triggered', '#F472B6'],
      ['Polychrome (3%)', 'x1.5 Mult when triggered', '#C084FC'],
      ['Negative (2%)', '+1 Max Card Slot (0 space)', '#38BDF8']
    ];
    let ey = y + 102;
    for (const [name, txt, col] of edList) {
      ctx.font = '800 14px ui-sans-serif, system-ui, sans-serif';
      ctx.fillStyle = col;
      ctx.fillText(name, rx, ey);
      ctx.font = '600 12.5px ui-sans-serif, system-ui, sans-serif';
      ctx.fillStyle = '#D1E0E8';
      ctx.fillText(txt, rx, ey + 19);
      ey += 48;
    }

    // Pro Tips box
    drawBevelPanel(ctx, rx, ey + 10, 308, 134, {
      fill: '#13211C', border: '#275948', lip: 2, r: 7
    });
    ctx.font = '800 12.5px ui-monospace, SFMono-Regular, Menlo, monospace';
    ctx.fillStyle = COLORS.brassBright;
    ctx.fillText('STRATEGY TIPS', rx + 14, ey + 24);
    ctx.font = '600 12px ui-sans-serif, system-ui, sans-serif';
    ctx.fillStyle = '#CFE3DA';
    const tips = [
      '• Place +Mult cards LEFT of xMult cards.',
      '• Keep $25 banked for max +$5 Interest.',
      '• Reroll keeps selected dice locked.',
      '• Every 3rd stage has a Boss modifier.'
    ];
    tips.forEach((t, i) => ctx.fillText(t, rx + 14, ey + 48 + i * 21));

    // Footer shortcut line
    ctx.textAlign = 'center';
    ctx.font = '600 12px ui-monospace, SFMono-Regular, Menlo, monospace';
    ctx.fillStyle = COLORS.textMuted;
    ctx.fillText('Shortcuts: Keys 1–5 Toggle Dice · Space Play · R Reroll · C Clear · Esc Close', x + w / 2, y + h - 32);
  }
}

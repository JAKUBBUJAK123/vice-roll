// =============================================================================
// main.js — pętla symulacji (update), render, kontekst UI i bootstrap.
// =============================================================================
import { COLORS } from '../config/colors.js';
import { CARD_BY_ID } from '../config/cards.js';
import { lerp, updateGraphicsEffects, drawParticlesAndPopups, drawCRTOverlay, drawHitFlash, drawTableBackground } from '../engines/graphicEngine.js';
import { sfx } from '../engines/soundEngine.js';
import {
  drawLeftHUD, drawModifierCardTray, drawBottomSidePanels, drawClothAndTicketTooltips, drawPlayArena, drawDieInspectorTooltip, drawCashOutPanel,
  drawShopArena, drawCardTooltip, drawPotionTray, drawPotionTooltip, drawPotionPickScreen,
  drawArtefactTray, drawArtefactTooltip, drawArtefactPickScreen, drawTitleScreen, drawClothSelectScreen, drawEndModal, drawOverlayModal
} from '../engines/ui.js';
import { findHoveredDieIndex, initInputListeners } from '../engines/keyinputs.js';

import {
  LOGICAL_W, LOGICAL_H, BASE_MAX_SLOTS, SHOP_REROLL_COST, MAX_INTEREST,
  state, getStageLabel, getStageTarget, getUsedCardSlots, getBaseCardSlots, getMaxCardSlots,
  getMaxPotionSlots, getMaxArtefactSlots, getMaxSelectDice, getStageMaxHands, getStageMaxRerolls,
  getShopCardSlotCount, getShopRerollCost, initTitleBackdrop, spawnPopup, spawnParticles
} from './core.js';
import {
  openClothSelect, startNewRun, startStage, toggleDieSelection, playSelectedHand, triggerReroll, clearSelectedDice,
  isAnyDieTumbling, isDieDebuffedByBoss, isCardDebuffedByBoss, executeScoringStep, finishScoringPhase
} from './run.js';
import {
  enterShop, claimCashOut, rerollShop, buyShopCard, buyShopTicket, openWorkshopModal, applyWorkshopUpgrade,
  moveActiveCard, sellActiveCard, pickPotionReward, pickArtefactReward, usePotion, sellPotion, clonePoolDie
} from './shop.js';

const canvas = document.getElementById('game-canvas');
const ctx = canvas.getContext('2d');

function update(dt) {
  state.time += dt;

  if (state.noticeTimer > 0) state.noticeTimer = Math.max(0, state.noticeTimer - dt);

  if (state.displayScore < state.stageScore) {
    const diff = state.stageScore - state.displayScore;
    const step = Math.max(12, diff * Math.min(1, dt * 11));
    state.displayScore = Math.min(state.stageScore, state.displayScore + step);
    state.scoreTickAccum += dt;
    if (state.scoreTickAccum >= 0.045) {
      state.scoreTickAccum = 0;
      sfx.scoreTick();
    }
  } else if (state.displayScore > state.stageScore) {
    state.displayScore = state.stageScore;
  }

  for (const d of state.dice) {
    if (d.tumbleTimer > 0) {
      d.tumbleTimer = Math.max(0, d.tumbleTimer - dt);
      d.vy += 1850 * dt;
      d.y += d.vy * dt;
      d.angle += d.vAngle * dt;
      if (d.y >= d.targetY) {
        d.y = d.targetY;
        d.vy = -Math.abs(d.vy) * 0.42;
        d.vAngle *= 0.6;
      }
      if (d.tumbleTimer === 0) {
        d.y = d.targetY;
        d.vy = 0;
        d.angle = 0;
        d.vAngle = 0;
      }
    } else {
      d.y = lerp(d.y, d.targetY, Math.min(1, dt * 16));
      d.angle = lerp(d.angle, 0, Math.min(1, dt * 16));
    }
    d.scale = lerp(d.scale, 1, Math.min(1, dt * 14));
    d.hop = Math.max(0, d.hop - dt * 3.4);
    d.flash = Math.max(0, d.flash - dt * 3.2);
  }

  for (const c of state.activeCards) {
    if (!(state.drag && state.drag.active && state.drag.card === c)) {
      c.x = lerp(c.x, c.targetX, Math.min(1, dt * 15));
      c.y = lerp(c.y, c.targetY, Math.min(1, dt * 15));
    }
    c.bounce = Math.max(0, c.bounce - dt * 3.8);
    c.flash = Math.max(0, c.flash - dt * 2.8);
  }

  if (state.mode === 'SCORING' && !state.modal) {
    state.scoringTimer -= dt;
    if (state.scoringTimer <= 0) {
      if (state.scoringQueue.length > 0) {
        const nextStep = state.scoringQueue.shift();
        executeScoringStep(nextStep);
        state.scoringTimer = nextStep.duration;
      } else {
        finishScoringPhase();
      }
    }
  }

  if (state.mode === 'CASH_OUT') {
    state.cashOutReveal = Math.min(1.2, state.cashOutReveal + dt * 1.45);
    if (state.cashOutData && state.cashOutData.cardTriggers) {
      state.cashOutData.cardTriggers.forEach((trig, i) => {
        if (!trig.fired && state.cashOutReveal >= trig.at) {
          trig.fired = true;
          const c = trig.card;
          c.bounce = 1.2;
          c.flash = 1;
          c.pulseColor = COLORS.goldLight;
          spawnPopup(c.x, c.y + 58, '+$' + trig.amount, COLORS.goldLight, 24);
          spawnParticles(c.x, c.y, 18, [COLORS.goldLight, COLORS.gold, '#FFFFFF'], 70, 210);
          sfx.scoreStep(i + 1, 'money');
        }
      });
    }
  }

  updateGraphicsEffects(state, dt);
}

const uiCtx = {
  LOGICAL_W, LOGICAL_H, BASE_MAX_SLOTS, SHOP_REROLL_COST, MAX_INTEREST,
  getStageLabel, getStageTarget, getUsedCardSlots, getBaseCardSlots, getMaxCardSlots,
  getMaxPotionSlots, getMaxArtefactSlots, getMaxSelectDice, getStageMaxHands, getStageMaxRerolls,
  getShopCardSlotCount, getShopRerollCost,
  isDieDebuffedByBoss, isCardDebuffedByBoss, isAnyDieTumbling,
  openClothSelect, startNewRun, startStage, enterShop, playSelectedHand, triggerReroll, clearSelectedDice,
  claimCashOut, buyShopCard, buyShopTicket, openWorkshopModal, applyWorkshopUpgrade, rerollShop,
  moveActiveCard, sellActiveCard, pickPotionReward, pickArtefactReward, usePotion, sellPotion, clonePoolDie
};

// ---------- Render ----------
function render() {
  ctx.setTransform(state.dpr, 0, 0, state.dpr, 0, 0);
  drawTableBackground(ctx, state);

  state.buttons = [];
  state.hoverButtonId = null;
  state.hoveredCard = null;
  state.hoveredPotion = null;
  state.hoveredArtefact = null;
  state.hoveredCloth = null;
  state.hoveredTicket = null;
  state.hoveredDieIdx = (state.mode === 'PLAYING' && !state.modal)
    ? findHoveredDieIndex(state, state.mouseX, state.mouseY)
    : -1;

  const shakeX = state.shakeMag > 0.1 ? (Math.random() - 0.5) * 2 * state.shakeMag : 0;
  const shakeY = state.shakeMag > 0.1 ? (Math.random() - 0.5) * 2 * state.shakeMag : 0;

  ctx.save();
  ctx.translate(state.ox + shakeX * state.scale, state.oy + shakeY * state.scale);
  ctx.scale(state.scale, state.scale);

  if (state.mode === 'TITLE_MENU') {
    drawTitleScreen(ctx, state, uiCtx);
  } else if (state.mode === 'CLOTH_SELECT') {
    drawClothSelectScreen(ctx, state, uiCtx);
  } else {
    drawLeftHUD(ctx, state, uiCtx);
    drawModifierCardTray(ctx, state, uiCtx);
    drawBottomSidePanels(ctx, state);
    if (state.mode === 'PLAYING' || state.mode === 'SCORING') drawPlayArena(ctx, state, uiCtx);
    else if (state.mode === 'CASH_OUT') drawCashOutPanel(ctx, state, uiCtx);
    else if (state.mode === 'POTION_PICK') drawPotionPickScreen(ctx, state, uiCtx);
    else if (state.mode === 'ARTEFACT_PICK') drawArtefactPickScreen(ctx, state, uiCtx);
    else if (state.mode === 'SHOP') drawShopArena(ctx, state, uiCtx);
    else if (state.mode === 'VICTORY') drawEndModal(ctx, state, true, uiCtx);
    else if (state.mode === 'GAME_OVER') drawEndModal(ctx, state, false, uiCtx);
    drawArtefactTray(ctx, state, uiCtx);
    drawPotionTray(ctx, state, uiCtx);
  }

  drawParticlesAndPopups(ctx, state);
  drawCardTooltip(ctx, state, uiCtx);
  drawPotionTooltip(ctx, state, uiCtx);
  drawArtefactTooltip(ctx, state, uiCtx);
  drawClothAndTicketTooltips(ctx, state, uiCtx);
  drawDieInspectorTooltip(ctx, state, uiCtx);
  drawOverlayModal(ctx, state, uiCtx);
  drawHitFlash(ctx, state, LOGICAL_W, LOGICAL_H);

  ctx.restore();
  drawCRTOverlay(ctx, state);

  let cursor = 'default';
  if (state.drag && state.drag.active) cursor = 'grabbing';
  else if (state.hoverButtonId) cursor = 'pointer';
  else if (state.hoveredCard) cursor = state.hoveredCard.zone === 'active' ? 'grab' : 'pointer';
  else if (state.hoveredPotion || state.hoveredArtefact || state.hoveredCloth || state.hoveredTicket) cursor = 'pointer';
  else if (state.hoveredDieIdx !== -1) cursor = 'pointer';
  canvas.style.cursor = cursor;
}

// ---------- 8. Bootstrap ----------
initInputListeners(canvas, state, {
  LOGICAL_W, LOGICAL_H,
  openClothSelect, startNewRun, toggleDieSelection, playSelectedHand, triggerReroll,
  clearSelectedDice, claimCashOut, rerollShop, startStage
});
initTitleBackdrop();

let lastTime = performance.now();
function frame(now) {
  const rawDt = (now - lastTime) / 1000;
  lastTime = now;
  update(Math.min(Math.max(rawDt, 0), 0.05));
  render();
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
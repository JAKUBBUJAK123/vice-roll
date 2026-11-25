import { COLORS } from '../config/colors.js';
import { EDITIONS } from '../config/editions.js';
import { CARD_CATALOG, CARD_BY_ID, pickWeightedShopCard } from '../config/cards.js';
import { TICKET_COST, TICKET_CATALOG } from '../config/tickets.js';
import { POTION_CATALOG, POTION_BY_ID } from '../config/potions.js';
import { ARTEFACT_CATALOG, ARTEFACT_BY_ID } from '../config/artefacts.js';
import { MAX_DICE_COUNT, DICE_UPGRADE_CATALOG, getDynamicDiceLayout, createPoolDie } from '../config/dices.js';
import { sfx } from '../engines/soundEngine.js';
import {
  state, createCardInstance, getShopPriceIncrease, saveStats, getTicketStacks,
  getMaxPotionSlots, getMaxArtefactSlots, getMaxCardSlots,
  getShopCardSlotCount, getShopRerollCost,
  showNotice, spawnPopup, spawnParticles
} from './core.js';
import { updateLivePreview } from './run.js';

// ---------- Cash-out ----------
export function claimCashOut() {
  if (state.mode !== 'CASH_OUT' || !state.cashOutData) return;
  if (!state.cashOutData.claimed) {
    state.cashOutData.claimed = true;
    state.money += state.cashOutData.total;
    state.totalMoneyEarned += state.cashOutData.total;
    sfx.buyCard();
    spawnPopup(985, 65, '+$' + state.cashOutData.total, COLORS.goldLight, 26);
  }

  if (state.cashOutData.isRunVictory) {
    state.stats.wins = (state.stats.wins || 0) + 1;
    state.stats.bestStage = Math.max(state.stats.bestStage, 9);
    saveStats(state.stats);
    state.mode = 'VICTORY';
    sfx.victory();
    spawnParticles(640, 320, 80, [COLORS.goldLight, COLORS.emerald, COLORS.chipsLight, '#F472B6'], 120, 420);
    return;
  }

  if (state.stage % 3 === 2) {
    rollPotionRewardChoices();
    state.mode = 'POTION_PICK';
    state.focusedPotionIdx = null;
    sfx.cardSnap();
    return;
  }

  if (state.stage % 3 === 0) {
    state.activeCards.forEach((inst) => {
      const def = CARD_BY_ID[inst.cardId];
      if (def && def.morphAfterBoss) {
        const candidates = state.activeCards.filter(c => c.uid !== inst.uid && c.cardId !== 'AC');
        if (candidates.length > 0) {
          const chosen = candidates[Math.floor(Math.random() * candidates.length)];
          inst.cardId = chosen.cardId;
          inst.scalingBonus = chosen.scalingBonus || 0;
          inst.bounce = 1.25;
          inst.flash = 1;
          inst.pulseColor = COLORS.goldLight;
          const newDef = CARD_BY_ID[chosen.cardId];
          if (chosen.cardId === 'JH') scaleAllPoolDicePips(2);
          spawnPopup(inst.x, inst.y - 58, `Morph → ${newDef.rank}${newDef.suit[0].toUpperCase()}!`, COLORS.goldLight, 22);
          spawnParticles(inst.x, inst.y, 24, [COLORS.goldLight, '#5EEAD4', '#FFFFFF'], 80, 240);
        }
      }
    });

    rollArtefactRewardChoices();
    if (state.artefactChoices.length > 0) {
      state.mode = 'ARTEFACT_PICK';
      sfx.cardSnap();
      return;
    }
  }

  enterShop();
}

export function rollArtefactRewardChoices() {
  const unowned = ARTEFACT_CATALOG.filter(a => !state.artefacts.includes(a.id));
  for (let i = unowned.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [unowned[i], unowned[j]] = [unowned[j], unowned[i]];
  }
  state.artefactChoices = unowned.slice(0, 3).map(a => a.id);
}

export function pickArtefactReward(choiceIdx) {
  if (state.mode !== 'ARTEFACT_PICK') return;
  if (state.artefacts.length >= getMaxArtefactSlots()) {
    sfx.error();
    showNotice(`Artefact slots full (${getMaxArtefactSlots()}/${getMaxArtefactSlots()})!`, 1.8);
    return;
  }
  const artId = state.artefactChoices[choiceIdx];
  const def = ARTEFACT_BY_ID[artId];
  if (!def || state.artefacts.includes(artId)) return;
  state.artefacts.push(artId);
  sfx.buyCard();
  spawnPopup(126, 145, '+ ' + def.name, def.color, 20);
  spawnParticles(126, 138, 22, [def.color, '#FDE047', '#FFFFFF'], 70, 220);
  enterShop();
}

export function rollPotionRewardChoices() {
  const shuffled = [...POTION_CATALOG];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  state.potionChoices = shuffled.slice(0, 3).map(p => p.id);
}

export function pickPotionReward(choiceIdx) {
  if (state.mode !== 'POTION_PICK') return;
  const maxSlots = getMaxPotionSlots();
  if (state.potions.length >= maxSlots) {
    sfx.error();
    showNotice(`Potion belt full (${maxSlots}/${maxSlots})! Sell a potion or skip.`, 1.8);
    return;
  }
  const pId = state.potionChoices[choiceIdx];
  const def = POTION_BY_ID[pId];
  if (!def) return;
  state.potions.push({ id: pId, bounce: 1, flash: 1 });
  sfx.buyCard();
  spawnPopup(1154, 145, '+ ' + def.name, def.color, 20);
  enterShop();
}

export function sellPotion(slotIdx) {
  const pot = state.potions[slotIdx];
  if (!pot) return;
  const def = POTION_BY_ID[pot.id];
  const price = def ? def.sellPrice : 3;
  state.potions.splice(slotIdx, 1);
  state.focusedPotionIdx = null;
  state.money += price;
  state.totalMoneyEarned += price;
  sfx.sellCard();
  spawnPopup(985, 65, '+$' + price, COLORS.goldLight, 20);
}

export function usePotion(slotIdx) {
  if (state.mode === 'SCORING' || state.modal) return;
  const pot = state.potions[slotIdx];
  if (!pot) return;

  if (pot.id === 'STRENGTH') {
    state.potions.splice(slotIdx, 1);
    state.focusedPotionIdx = null;
    state.potionScoreMult = Math.round(state.potionScoreMult * 5);
    sfx.buyCard();
    spawnPopup(1154, 148, 'x5 SCORE ARMED!', '#FB7185', 22);
    spawnParticles(1154, 138, 18, ['#FB7185', '#FDA4AF', '#FFFFFF'], 70, 210);
    showNotice('Strength Potion active: next played hand scores x5!', 2.2);
  } else if (pot.id === 'CLONE') {
    state.focusedPotionIdx = null;
    state.clonePotionSlotIdx = slotIdx;
    state.modal = 'CLONE_POTION';
    sfx.click();
  } else if (pot.id === 'CLEANSE') {
    if (state.mode !== 'PLAYING' || !state.activeBoss) {
      sfx.error();
      showNotice('No active Boss Curse to cleanse right now!', 1.8);
      return;
    }
    state.potions.splice(slotIdx, 1);
    state.focusedPotionIdx = null;
    const oldName = state.activeBoss.name;
    state.activeBoss = null;
    sfx.buyCard();
    spawnPopup(220, 62, 'CURSE CLEANSED!', '#34D399', 22);
    spawnParticles(220, 56, 22, ['#34D399', '#A7F3D0', '#FFFFFF'], 80, 220);
    showNotice(`Cleanse Potion removed ${oldName}!`, 2.2);
    updateLivePreview();
  }
}

export function clonePoolDie(dieIdx, slotIdx) {
  const src = state.dicePool[dieIdx];
  if (!src) return;
  const newId = state.dicePool.length;
  const clonedPoolDie = {
    id: newId,
    faces: src.faces.map(f => ({ value: f.value, mod: f.mod }))
  };
  state.dicePool.push(clonedPoolDie);

  if (state.mode === 'PLAYING') {
    const fIdx = Math.floor(Math.random() * 6);
    const fObj = clonedPoolDie.faces[fIdx];
    state.dice.push({
      id: newId,
      faces: clonedPoolDie.faces,
      faceIndex: fIdx,
      value: fObj.value,
      effectiveValue: fObj.value,
      mod: fObj.mod,
      selected: false,
      x: 640,
      y: 220,
      targetX: 640,
      targetY: 340,
      vy: 0,
      renderSize: 98,
      tumbleTimer: 0.45,
      flickerTimer: 0,
      hop: 1.0,
      flash: 1.0,
      flashColor: '#38BDF8',
      angle: (Math.random() - 0.5) * 1.2,
      vAngle: (Math.random() - 0.5) * 14,
      scale: 1
    });
    const layout = getDynamicDiceLayout(state.dice.length);
    state.dice.forEach((d, idx) => {
      d.targetX = layout.startX + idx * layout.spacing;
      d.targetY = layout.baseY;
      d.renderSize = layout.size;
    });
    updateLivePreview();
  }

  if (slotIdx !== null && slotIdx !== undefined && state.potions[slotIdx]) {
    state.potions.splice(slotIdx, 1);
  }
  state.modal = null;
  state.clonePotionSlotIdx = null;
  sfx.buyCard();
  spawnPopup(640, 260, `CLONED DIE #${dieIdx + 1}!`, '#38BDF8', 24);
  spawnParticles(640, 300, 22, ['#38BDF8', '#BAE6FD', '#FFFFFF'], 80, 240);
}

// ---------- Bazaar / Shop ----------
function rollStakeTicketIfNeeded() {
  const stake = Math.floor((state.stage - 1) / 3) + 1;
  if (state.currentTicketStake === stake && state.shopTicket) return;
  state.currentTicketStake = stake;

  const available = TICKET_CATALOG.filter(t => {
    const stacks = getTicketStacks(t.id);
    if (stacks >= t.maxStacks) return false;
    if (t.id === 'HEAVY_CUP' && state.dicePool.length >= MAX_DICE_COUNT) return false;
    return true;
  });

  if (available.length === 0) {
    state.shopTicket = null;
    return;
  }
  const chosen = available[Math.floor(Math.random() * available.length)];
  state.shopTicket = { ...chosen, purchased: false };
}

function rollWorkshopUpgrades() {
  const shuffled = [...DICE_UPGRADE_CATALOG];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  const priceAdd = getShopPriceIncrease();
  state.shopDiceUpgrades = shuffled.slice(0, 2).map(u => ({ ...u, price: u.price + priceAdd }));
}

export function enterShop() {
  state.mode = 'SHOP';
  state.modal = null;
  state.workshopTarget = null;
  state.focusedActiveUid = null;
  state.shopRerollsUsed = 0;
  rollStakeTicketIfNeeded();
  rollShopInventory();
}

function rollShopInventory() {
  const slotCount = getShopCardSlotCount();
  const ownedIds = new Set(state.activeCards.map(c => c.cardId));
  let pool = CARD_CATALOG.filter(c => !ownedIds.has(c.id));
  if (pool.length < slotCount) pool = [...CARD_CATALOG];

  const luckyStacks = getTicketStacks('LUCKY_CLOVER');
  const picked = [];
  for (let i = 0; i < slotCount && pool.length > 0; i++) {
    const def = pickWeightedShopCard(pool, luckyStacks);
    if (!def) break;
    picked.push(createCardInstance(def.id));
    pool = pool.filter(c => c.id !== def.id);
  }

  state.shopCards = picked;
  rollWorkshopUpgrades();
  sfx.cardSnap();
}

export function rerollShop() {
  if (state.mode !== 'SHOP' || state.modal) return;
  const cost = getShopRerollCost();
  if (state.money < cost) {
    sfx.error();
    showNotice('Need $' + cost + ' to refresh the Bazaar', 1.4);
    return;
  }
  state.money -= cost;
  state.shopRerollsUsed = (state.shopRerollsUsed || 0) + 1;
  spawnPopup(985, 65, '-$' + cost, COLORS.multLight, 22);
  rollShopInventory();
}

export function buyShopTicket() {
  if (state.mode !== 'SHOP' || state.modal) return;
  const t = state.shopTicket;
  if (!t || t.purchased) return;
  if (state.money < TICKET_COST) {
    sfx.error();
    showNotice(`Need $${TICKET_COST} to redeem Ticket`, 1.4);
    return;
  }

  state.money -= TICKET_COST;
  t.purchased = true;
  state.tickets[t.id] = getTicketStacks(t.id) + 1;

  if (t.id === 'HEAVY_CUP' && state.dicePool.length < MAX_DICE_COUNT) {
    const newDie = createPoolDie(state.dicePool.length);
    const jhCount = state.activeCards.filter(c => c.cardId === 'JH').length;
    if (jhCount > 0) {
      const mult = Math.pow(2, jhCount);
      newDie.faces.forEach(f => { f.value *= mult; });
    }
    state.dicePool.push(newDie);
  } else if (t.id === 'VIP_PASS') {
    const existingIds = new Set([
      ...state.activeCards.map(c => c.cardId),
      ...state.shopCards.filter(Boolean).map(c => c.cardId)
    ]);
    const extraPool = CARD_CATALOG.filter(c => !existingIds.has(c.id));
    const pick = pickWeightedShopCard(extraPool.length > 0 ? extraPool : CARD_CATALOG, getTicketStacks('LUCKY_CLOVER'));
    state.shopCards.push(createCardInstance(pick.id));
  }

  sfx.buyCard();
  spawnPopup(985, 65, '-$' + TICKET_COST, COLORS.goldLight, 22);
  spawnPopup(140, 300, t.name + ' Unlocked!', t.color, 24);
  spawnParticles(140, 330, 32, [t.color, COLORS.goldLight, '#FFFFFF'], 90, 260);
  showNotice(`Redeemed ${t.name}: ${t.desc}`, 2.4);
}

export function openWorkshopModal(shopIdx) {
  if (state.mode !== 'SHOP' || state.modal) return;
  const upg = state.shopDiceUpgrades[shopIdx];
  if (!upg) return;
  if (state.money < upg.price) {
    sfx.error();
    showNotice(`Need $${upg.price} for ${upg.name}`, 1.4);
    return;
  }
  sfx.click();
  state.workshopTarget = { shopIdx, upgrade: upg };
  state.workshopDieIdx = 0;
  state.modal = 'WORKSHOP';
}

export function applyWorkshopUpgrade(shopIdx, dieIdx, faceIdx) {
  const upg = state.shopDiceUpgrades[shopIdx];
  const targetDie = state.dicePool[dieIdx];
  if (!upg || !targetDie || !targetDie.faces[faceIdx]) return;
  if (state.money < upg.price) {
    sfx.error();
    return;
  }

  state.money -= upg.price;
  const face = targetDie.faces[faceIdx];
  if (upg.type === 'value_add' && upg.valueAdd < 0 && face.value <= (upg.minValue ?? 1)) {
    sfx.error();
    return;
  }
  if (upg.type === 'value_add') {
    face.value += upg.valueAdd;
  } else if (upg.type === 'mod') {
    face.mod = upg.mod;
  }

  state.shopDiceUpgrades[shopIdx] = null;
  state.modal = null;
  state.workshopTarget = null;

  sfx.buyCard();
  spawnPopup(985, 65, '-$' + upg.price, COLORS.goldLight, 22);
  spawnPopup(920, 320, `Die #${dieIdx + 1} Face #${faceIdx + 1} Forged!`, upg.color, 22);
  spawnParticles(920, 340, 26, [upg.color, COLORS.goldLight, '#FFFFFF'], 80, 240);
  showNotice(`Applied ${upg.name} to Die #${dieIdx + 1} (Face #${faceIdx + 1})!`, 2.2);
}

export function scaleAllPoolDicePips(factor) {
  for (const pd of state.dicePool) {
    for (const f of pd.faces) {
      f.value = factor >= 1 ? Math.round(f.value * factor) : Math.max(1, Math.round(f.value * factor));
    }
  }
  if (Array.isArray(state.dice)) {
    for (const d of state.dice) {
      if (d.faces && d.faces[d.faceIndex]) {
        d.value = d.faces[d.faceIndex].value;
        d.effectiveValue = d.value;
        d.hop = 0.7;
        d.flash = 0.8;
        d.flashColor = COLORS.goldLight;
      }
    }
    if (state.mode === 'PLAYING') updateLivePreview();
  }
}

export function buyShopCard(shopIdx) {
  if (state.mode !== 'SHOP' || state.modal) return;
  const card = state.shopCards[shopIdx];
  if (!card) return;
  if (state.money < card.price) {
    sfx.error();
    showNotice('Not enough money ($' + card.price + ' required)', 1.4);
    return;
  }
  const isNeg = card.edition === 'negative';
  if (!isNeg && state.activeCards.length >= getMaxCardSlots()) {
    sfx.error();
    showNotice('Card dock full — sell a card first!', 1.6);
    return;
  }

  state.money -= card.price;
  state.shopCards[shopIdx] = null;
  card.bounce = 1.2;
  card.flash = 1;
  card.pulseColor = EDITIONS[card.edition].color;
  state.activeCards.push(card);
  if (card.cardId === 'JH') scaleAllPoolDicePips(2);
  sfx.buyCard();
  spawnPopup(985, 65, '-$' + card.price, COLORS.goldLight, 22);
  spawnParticles(640, 640, 20, [COLORS.goldLight, EDITIONS[card.edition].color, '#FFFFFF'], 70, 220);
}

export function sellActiveCard(idx) {
  if ((state.mode !== 'PLAYING' && state.mode !== 'SHOP') || state.modal) return;
  const card = state.activeCards[idx];
  if (!card) return;

  const val = card.sellValue;
  spawnPopup(card.x, card.y, '+$' + val, COLORS.goldLight, 24);
  spawnParticles(card.x, card.y, 14, [COLORS.goldLight, '#FFFFFF'], 60, 170);
  state.activeCards.splice(idx, 1);
  if (card.cardId === 'JH') scaleAllPoolDicePips(0.5);
  state.money += val;
  state.totalMoneyEarned += val;
  state.focusedActiveUid = null;
  sfx.sellCard();
}

export function moveActiveCard(idx, delta) {
  if ((state.mode !== 'PLAYING' && state.mode !== 'SHOP') || state.modal) return;
  const target = idx + delta;
  if (target < 0 || target >= state.activeCards.length) return;
  const tmp = state.activeCards[idx];
  state.activeCards[idx] = state.activeCards[target];
  state.activeCards[target] = tmp;
  tmp.bounce = 0.7;
  sfx.cardSnap();
}

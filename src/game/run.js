import { COLORS } from '../config/colors.js';
import { EDITIONS } from '../config/editions.js';
import { CARD_BY_ID } from '../config/cards.js';
import { TICKET_CATALOG } from '../config/tickets.js';
import { POTION_CATALOG } from '../config/potions.js';
import { ARTEFACT_CATALOG, ARTEFACT_BY_ID } from '../config/artefacts.js';
import { CLOTH_BY_ID } from '../config/cloths.js';
import { DICE_COUNT, DICE_SIDES, FACE_MOD_META, createPoolDie, createFreshDice } from '../config/dices.js';
import { sfx } from '../engines/soundEngine.js';
import { fmtNum, fmtMult } from '../engines/ui.js';
import {
  MAX_INTEREST, BOSS_MODIFIERS, state, saveStats, getStageTarget, getStageBaseReward,
  resolveDiceAndEvaluateHand, getTicketStacks, getMaxSelectDice, hasArtefact,
  getStageMaxHands, getStageMaxRerolls, showNotice, addShake, spawnPopup, spawnParticles
} from './core.js';

export function openClothSelect() {
  sfx.unlock();
  sfx.click();
  state.modal = null;
  state.mode = 'CLOTH_SELECT';
}

export function startNewRun(clothId = null, difficultyId = null) {
  sfx.unlock();
  sfx.buyCard();
  if (clothId) state.selectedClothId = clothId;
  if (difficultyId) state.selectedDifficultyId = difficultyId;
  state.stage = 1;
  state.endless = false;
  // state.money = 4 + (state.selectedClothId === 'WHITE_SILK' ? 20 : 0);
  state.money =20000000000;
  state.tickets = {};
  state.dicePool = Array.from({ length: DICE_COUNT }, (_, i) => createPoolDie(i));
  state.currentTicketStake = 0;
  state.shopTicket = null;
  state.shopDiceUpgrades = [];
  state.workshopTarget = null;
  state.workshopDieIdx = 0;
  state.activeCards = [];
  state.shopCards = [];
  state.potions = [];
  state.potionChoices = [];
  state.focusedPotionIdx = null;
  state.hoveredPotion = null;
  state.potionScoreMult = 1;
  state.echoPotionActive = 0;
  state.gildedTonicActive = 0;
  state.pendingGildedTonic = 0;
  state.comboUpgradeMult = 1;
  state.artefacts = [];
  state.artefactChoices = [];
  state.hoveredArtefact = null;
  state.clonePotionSlotIdx = null;
  state.usedBossIds = [];
  state.bestHandScore = 0;
  state.totalMoneyEarned = 0;
  state.handsPlayedRun = 0;
  state.modal = null;
  state.focusedActiveUid = null;
  state.drag = null;

  // Cloth starting bonuses
  if (state.selectedClothId === 'GILDED_IVORY' && TICKET_CATALOG.length > 0) {
    const t = TICKET_CATALOG[Math.floor(Math.random() * TICKET_CATALOG.length)];
    state.tickets[t.id] = 1;
    if (t.id === 'HEAVY_CUP') {
      state.dicePool.push(createPoolDie(state.dicePool.length));
    }
    showNotice(`Gilded Ivory granted Ticket: ${t.name}!`, 2.6);
  } else if (state.selectedClothId === 'MYTHIC_TEAL' && ARTEFACT_CATALOG.length > 0) {
    const a = ARTEFACT_CATALOG[Math.floor(Math.random() * ARTEFACT_CATALOG.length)];
    state.artefacts.push(a.id);
    showNotice(`Mythic Teal granted Artefact: ${a.name}!`, 2.6);
  } else if (state.selectedClothId === 'WITCH_CLOTH' && POTION_CATALOG.length > 0) {
    const p = POTION_CATALOG[Math.floor(Math.random() * POTION_CATALOG.length)];
    state.potions.push({ id: p.id, bounce: 1, flash: 1 });
    showNotice(`Witch Cloth brewed: ${p.name}!`, 2.6);
  }

  startStage(1);
}

export function startStage(stageNum) {
  state.stage = stageNum;
  state.targetScore = getStageTarget(stageNum);
  state.stageScore = 0;
  state.displayScore = 0;
  state.scoringHandTotal = 0;
  state.scoringQueue = [];
  state.scoringBanner = '';
  state.mode = 'PLAYING';
  state.modal = null;
  state.workshopTarget = null;
  state.focusedActiveUid = null;
  state.comboUpgradeMult = 1;
  state.rerollsUsedThisStage = 0;
  state.gildedTonicActive = state.pendingGildedTonic || 0;
  state.pendingGildedTonic = 0;

  // Assign Boss every 3rd stage
  if (stageNum % 3 === 0) {
    let pool = BOSS_MODIFIERS.filter(b => !state.usedBossIds.includes(b.id));
    if (pool.length === 0) {
      state.usedBossIds = [];
      pool = BOSS_MODIFIERS;
    }
    const boss = pool[Math.floor(Math.random() * pool.length)];
    state.activeBoss = boss;
    state.usedBossIds.push(boss.id);
    sfx.bossIntro();
    showNotice('BOSS CURSE: ' + boss.name + ' — ' + boss.short, 2.8);
  } else {
    state.activeBoss = null;
  }

  state.handsLeft = getStageMaxHands();
  state.rerollsLeft = getStageMaxRerolls();

  state.dice = createFreshDice(state.dicePool);
  sfx.diceRoll(state.dice.length);
  updateLivePreview();
}

export function rollDiceSet(indicesToRoll) {
  if (indicesToRoll.length === 0) return;
  sfx.diceRoll(indicesToRoll.length);
  for (let k = 0; k < indicesToRoll.length; k++) {
    const d = state.dice[indicesToRoll[k]];
    const faceIdx = Math.floor(Math.random() * DICE_SIDES);
    const face = d.faces[faceIdx];
    d.faceIndex = faceIdx;
    d.value = face.value;
    d.mod = face.mod;
    d.effectiveValue = face.value;
    d.y = d.targetY - 90 - Math.random() * 45;
    d.vy = -120 - Math.random() * 80;
    d.angle = (Math.random() - 0.5) * 1.6;
    d.vAngle = (Math.random() > 0.5 ? 1 : -1) * (10 + Math.random() * 9);
    d.tumbleTimer = 0.36 + k * 0.05;
    d.flickerTimer = 0;
    d.scale = 1.12;
    spawnParticles(d.x, d.targetY + 25, 5, ['rgba(247,243,232,0.7)', COLORS.brassBright], 40, 110);
  }
  updateLivePreview();
}

export function isAnyDieTumbling() {
  return state.dice.some(d => d.tumbleTimer > 0.02);
}

export function toggleDieSelection(idx) {
  if (state.mode !== 'PLAYING' || state.modal) return;
  const d = state.dice[idx];
  if (!d) return;
  const maxSelect = getMaxSelectDice();
  if (d.selected) {
    d.selected = false;
    d.effectiveValue = d.value;
    d.scale = 0.92;
    sfx.dieSelect(false);
  } else {
    const curSelected = state.dice.filter(x => x.selected).length;
    if (curSelected >= maxSelect) {
      sfx.error();
      showNotice(`Maximum ${maxSelect} dice per hand — deselect one first`, 1.4);
      d.scale = 0.9;
      return;
    }
    d.selected = true;
    d.scale = 1.12;
    sfx.dieSelect(true);
  }
  updateLivePreview();
}

export function clearSelectedDice() {
  if (state.mode !== 'PLAYING' || state.modal) return;
  let changed = false;
  for (const d of state.dice) {
    if (d.selected) {
      d.selected = false;
      d.effectiveValue = d.value;
      changed = true;
    }
  }
  if (changed) {
    sfx.dieSelect(false);
    updateLivePreview();
  }
}

export function triggerReroll() {
  if (state.mode !== 'PLAYING' || state.modal || isAnyDieTumbling()) return;
  if (state.rerollsLeft <= 0) {
    sfx.error();
    showNotice('No Rerolls remaining this chapter', 1.4);
    return;
  }
  const unselected = [];
  for (let i = 0; i < state.dice.length; i++) {
    if (!state.dice[i].selected) unselected.push(i);
  }
  if (unselected.length === 0) {
    sfx.error();
    showNotice('Unlock at least one die to reroll', 1.4);
    return;
  }
  state.rerollsLeft--;
  state.rerollsUsedThisStage = (state.rerollsUsedThisStage || 0) + 1;
  let toRoll = unselected;
  if (hasArtefact('CRACKED_CUP')) {
    toRoll = [];
    for (const idx of unselected) {
      if (Math.random() < 0.25) {
        const d = state.dice[idx];
        if (d) {
          d.flash = 0.8;
          d.flashColor = '#60A5FA';
          spawnPopup(d.x, d.y - 54, 'Jammed!', '#93C5FD', 18);
        }
      } else {
        toRoll.push(idx);
      }
    }
    if (toRoll.length === 0) {
      sfx.error();
      updateLivePreview();
      return;
    }
  }
  rollDiceSet(toRoll);
}

export function updateLivePreview() {
  if (state.mode === 'SCORING') return;
  const selected = state.dice.filter(d => d.selected);
  if (selected.length === 0) {
    state.liveHandName = '';
    state.chips = 0;
    state.mult = 0;
    return;
  }
  const { hand } = resolveDiceAndEvaluateHand(selected);
  state.liveHandName = hand.name;
  state.chips = hand.chips;
  state.mult = hand.mult;
}

export function isDieDebuffedByBoss(val) {
  if (val % 2 === 1 && hasArtefact('RED_CROWN')) return true;
  if (state.selectedClothId === 'PALLADINS_CLOTH') return false;
  if (!state.activeBoss) return false;
  if (state.activeBoss.id === 'EVEN_ZERO' && val % 2 === 0) return true;
  if (state.activeBoss.id === 'ODD_ZERO' && val % 2 === 1) return true;
  return false;
}

export function isCardDebuffedByBoss(cardIndex) {
  if (state.selectedClothId === 'PALLADINS_CLOTH') return false;
  return Boolean(state.activeBoss && state.activeBoss.id === 'DISABLE_FIRST' && cardIndex === 0);
}

export function playSelectedHand() {
  if (state.mode !== 'PLAYING' || state.modal || isAnyDieTumbling()) return;
  const playedDice = state.dice.filter(d => d.selected);
  const maxSelect = getMaxSelectDice();
  if (playedDice.length === 0) {
    sfx.error();
    showNotice(`Select 1 to ${maxSelect} dice to score a hand`, 1.5);
    return;
  }
  if (state.selectedClothId !== 'PALLADINS_CLOTH' && state.activeBoss && state.activeBoss.id === 'MIN_TWO_DICE' && playedDice.length < 2) {
    sfx.error();
    showNotice('The Heavy Felt requires at least 2 dice!', 1.8);
    return;
  }

  const { hand } = resolveDiceAndEvaluateHand(playedDice);
  state.handsLeft--;
  state.handsPlayedRun++;
  state.mode = 'SCORING';
  state.focusedActiveUid = null;
  state.drag = null;

  const playedProxies = playedDice.map(d => ({
    id: d.id,
    value: d.effectiveValue || d.value,
    rawValue: d.value,
    mod: d.mod,
    dieRef: d
  }));

  const steps = [];
  const playedSum = playedProxies.reduce((acc, d) => acc + d.value, 0);
  const unplayedDice = state.dice.filter(d => !d.selected);
  const unplayedCount = unplayedDice.length;

  steps.push({
    type: 'BASE_HAND',
    hand,
    duration: 0.42
  });

  function resolveCardTarget(idx) {
    let curIdx = idx;
    const visited = new Set();
    while (curIdx >= 0 && curIdx < state.activeCards.length && !visited.has(curIdx)) {
      visited.add(curIdx);
      const inst = state.activeCards[curIdx];
      const def = CARD_BY_ID[inst.cardId];
      if (!def) return null;
      if (def.copyRight) {
        curIdx += 1;
        continue;
      }
      return { inst, def };
    }
    return null;
  }

  const retriggerFirstCards = [];
  const retriggerSixCards = [];
  const retriggerOddCards = [];
  const retriggerEvenCards = [];
  const doubleGemCards = [];
  state.activeCards.forEach((inst, idx) => {
    if (isCardDebuffedByBoss(idx)) return;
    const def = CARD_BY_ID[inst.cardId];
    const target = def.copyRight ? resolveCardTarget(idx) : { inst, def };
    if (!target) return;
    if (target.def.retriggerFirst) retriggerFirstCards.push(inst);
    if (target.def.retriggerSix) retriggerSixCards.push(inst);
    if (target.def.retriggerOdd) retriggerOddCards.push(inst);
    if (target.def.retriggerEven) retriggerEvenCards.push(inst);
    if (target.def.doubleGems) doubleGemCards.push(inst);
  });

  const shatteredDieIds = new Set();
  let shatteredCount = 0;

  function enqueueDieScoring(proxy, retriggerCard = null, echoRetrigger = false) {
    const die = proxy.dieRef;
    const scoredValue = proxy.value;
    const debuffed = isDieDebuffedByBoss(scoredValue);

    steps.push({
      type: 'DIE_SCORE',
      die,
      scoredValue,
      debuffed,
      retriggerCard,
      echoRetrigger,
      duration: 0.28
    });

    if (die.mod && die.mod !== 'wild' && !shatteredDieIds.has(die.id)) {
      const shattered = die.mod === 'glass' && Math.random() < 0.25;
      if (shattered) {
        shatteredDieIds.add(die.id);
        shatteredCount++;
      }
      steps.push({
        type: 'DIE_FACE_MOD',
        die,
        mod: die.mod,
        shattered,
        doubleGemCards,
        duration: 0.32
      });
    }
  }

  const scoredDiceLog = [];
  playedProxies.forEach((proxy, idx) => {
    scoredDiceLog.push(proxy);
    enqueueDieScoring(proxy, null);

    if (idx === 0) {
      for (const rc of retriggerFirstCards) {
        scoredDiceLog.push(proxy);
        enqueueDieScoring(proxy, rc);
      }
    }
    if (proxy.value === 6) {
      for (const rc of retriggerSixCards) {
        scoredDiceLog.push(proxy);
        enqueueDieScoring(proxy, rc);
      }
    }
    if (proxy.value % 2 === 1) {
      for (const rc of retriggerOddCards) {
        scoredDiceLog.push(proxy);
        enqueueDieScoring(proxy, rc);
      }
    }
    if (proxy.value % 2 === 0) {
      for (const rc of retriggerEvenCards) {
        scoredDiceLog.push(proxy);
        enqueueDieScoring(proxy, rc);
      }
    }
    if (state.echoPotionActive > 0) {
      for (let e = 0; e < state.echoPotionActive; e++) {
        scoredDiceLog.push(proxy);
        enqueueDieScoring(proxy, null, true);
      }
    }
  });
  state.echoPotionActive = 0;

  const evalCtx = {
    hand,
    playedDice: playedProxies,
    scoredDice: scoredDiceLog,
    playedSum,
    unplayedDice,
    unplayedCount,
    rerollsLeft: state.rerollsLeft,
    handsLeftAfterPlay: state.handsLeft,
    money: state.money,
    shatteredCount
  };

  state.activeCards.forEach((inst, idx) => {
    const def = CARD_BY_ID[inst.cardId];
    if (isCardDebuffedByBoss(idx)) {
      steps.push({
        type: 'CARD_DEBUFFED',
        card: inst,
        duration: 0.30
      });
      return;
    }

    let evalInst = inst;
    let evalDef = def;
    if (def.copyRight) {
      const target = resolveCardTarget(idx);
      if (target) {
        evalInst = target.inst;
        evalDef = target.def;
      }
    }

    const cardEvents = evalDef.evaluate(evalInst, evalCtx);
    for (const ev of cardEvents) {
      steps.push({
        type: 'CARD_EVENT',
        card: inst,
        scaleTarget: evalInst,
        def: evalDef,
        ev,
        duration: cardEvents.length > 2 ? 0.25 : 0.34
      });
    }

    if (inst.edition === 'foil') {
      steps.push({
        type: 'EDITION_EVENT',
        card: inst,
        edition: 'foil',
        chipsAdd: 50,
        label: 'Gilded +50',
        color: '#F5CD79',
        sfx: 'chips',
        duration: 0.30
      });
    } else if (inst.edition === 'holographic') {
      steps.push({
        type: 'EDITION_EVENT',
        card: inst,
        edition: 'holographic',
        multAdd: 12,
        label: 'Crimson +12M',
        color: '#FB7185',
        sfx: 'mult',
        duration: 0.30
      });
    } else if (inst.edition === 'polychrome') {
      steps.push({
        type: 'EDITION_EVENT',
        card: inst,
        edition: 'polychrome',
        multMul: 1.5,
        label: 'Prism x1.5',
        color: '#E0F2FE',
        sfx: 'xmult',
        duration: 0.34
      });
    }

    if (idx === 0 && hasArtefact('RED_CROWN')) {
      steps.push({
        type: 'ARTEFACT_EVENT',
        artefactId: 'RED_CROWN',
        card: inst,
        multMul: 4,
        label: 'Red Crown x4',
        color: '#FB7185',
        sfx: 'xmult',
        duration: 0.36
      });
    }
  });

  if (hasArtefact('SLIMEBALL')) {
    for (const d of scoredDiceLog) {
      if (d.value === 4) {
        steps.push({
          type: 'ARTEFACT_EVENT',
          artefactId: 'SLIMEBALL',
          dieId: d.id,
          multMul: 2,
          label: 'Slimeball x2',
          color: '#4ADE80',
          sfx: 'xmult',
          duration: 0.32
        });
      }
    }
  }

  if (hasArtefact('PENNY')) {
    for (const d of scoredDiceLog) {
      if (d.value === 5 || d.value === 6) {
        steps.push({
          type: 'ARTEFACT_EVENT',
          artefactId: 'PENNY',
          dieId: d.id,
          moneyAdd: 1,
          label: 'Lucky Penny +$1',
          color: '#FACC15',
          sfx: 'money',
          duration: 0.28
        });
      } else if (d.value >= 1 && d.value <= 3) {
        steps.push({
          type: 'ARTEFACT_EVENT',
          artefactId: 'PENNY',
          dieId: d.id,
          moneyAdd: -1,
          label: 'Lucky Penny -$1',
          color: '#FB7185',
          sfx: 'debuff',
          duration: 0.28
        });
      }
    }
  }

  if (hasArtefact('BONE') && unplayedDice.length > 0) {
    for (const ud of unplayedDice) {
      steps.push({
        type: 'ARTEFACT_EVENT',
        artefactId: 'BONE',
        dieId: ud.id,
        multMul: 1.5,
        label: 'The Bone x1.5',
        color: '#E2E8F0',
        sfx: 'xmult',
        duration: 0.32
      });
    }
  }

  if (hasArtefact('PUCH')) {
    steps.push({
      type: 'ARTEFACT_EVENT',
      artefactId: 'PUCH',
      moneyAdd: -2,
      label: 'Loaded Pouch -$2',
      color: '#F59E0B',
      sfx: 'debuff',
      duration: 0.32
    });
  }

  if (hasArtefact('SWORD')) {
    const isLastHand = state.handsLeft === 0;
    steps.push({
      type: 'ARTEFACT_EVENT',
      artefactId: 'SWORD',
      multAdd: isLastHand ? 160 : -20,
      label: isLastHand ? 'Rusty Sword +160M!' : 'Rusty Sword -20M',
      color: isLastHand ? '#F87171' : '#94A3B8',
      sfx: isLastHand ? 'xmult' : 'debuff',
      duration: 0.36
    });
  }

  if (hasArtefact('CRACKED_CUP') && state.rerollsUsedThisStage > 0) {
    const addM = state.rerollsUsedThisStage * 10;
    steps.push({
      type: 'ARTEFACT_EVENT',
      artefactId: 'CRACKED_CUP',
      multAdd: addM,
      label: `Cracked Cup +${addM}M`,
      color: '#60A5FA',
      sfx: 'mult',
      duration: 0.34
    });
  }

  if (state.selectedClothId === 'CRIMSON_VELVET' && state.activeCards.length > 0) {
    const multFactor = Math.pow(2, state.activeCards.length);
    steps.push({
      type: 'CLOTH_EVENT',
      clothId: 'CRIMSON_VELVET',
      multMul: multFactor,
      label: `Crimson Velvet x${multFactor}`,
      color: '#FB7185',
      sfx: 'xmult',
      duration: 0.38
    });
  }

  if (state.gildedTonicActive > 0) {
    steps.push({
      type: 'POTION_GOLD',
      moneyAdd: 5 * state.gildedTonicActive,
      duration: 0.36
    });
  }

  if (state.potionScoreMult > 1) {
    steps.push({
      type: 'POTION_MULT',
      multMul: state.potionScoreMult,
      duration: 0.45
    });
  }

  steps.push({
    type: 'TOTAL_SLAM',
    duration: 0.95
  });

  state.scoringQueue = steps;
  state.scoringTimer = 0.05;
  state.scoringStepCount = 0;
  state.scoringHandTotal = 0;
  state.liveHandName = hand.name;
  state.chips = hand.chips;
  state.mult = hand.mult;
}

export function executeScoringStep(step) {
  if (step.type === 'BASE_HAND') {
    state.chips = step.hand.chips;
    state.mult = step.hand.mult;
    state.scoringBanner = step.hand.name + '  (' + step.hand.chips + ' × ' + step.hand.mult + ')';
    sfx.scoreStep(0, 'chips');
    spawnPopup(640, 140, step.hand.name + '!', COLORS.brassBright, 20);
    return;
  }

  if (step.type === 'DIE_SCORE') {
    const d = step.die;
    const val = step.scoredValue;
    d.hop = 1;
    if (step.retriggerCard) {
      step.retriggerCard.bounce = 1;
      step.retriggerCard.flash = 1;
      step.retriggerCard.pulseColor = COLORS.goldLight;
      spawnPopup(step.retriggerCard.x, step.retriggerCard.y - 36, 'Retrigger!', COLORS.goldLight, 18);
      sfx.scoreStep(state.scoringStepCount, 'retrigger');
    } else if (step.echoRetrigger) {
      spawnPopup(d.x, d.y - 94, 'Echo Retrigger!', '#2DD4BF', 18);
      sfx.scoreStep(state.scoringStepCount, 'retrigger');
    }
    if (step.debuffed) {
      d.flash = 1;
      d.flashColor = COLORS.multRed;
      const fromCrown = (val % 2 === 1) && hasArtefact('RED_CROWN') && !(state.activeBoss && state.activeBoss.id === 'ODD_ZERO');
      state.scoringBanner = (fromCrown ? 'Red Crown' : state.activeBoss.name) + ' blocked ' + val + '!';
      spawnPopup(d.x, d.y - 68, fromCrown ? '0 (Crown)' : '0 (Curse)', COLORS.multLight, 20);
      sfx.scoreStep(state.scoringStepCount, 'debuff');
    } else {
      state.chips += val;
      d.flash = 1;
      d.flashColor = COLORS.chipsLight;
      state.scoringStepCount++;
      const wildNote = d.mod === 'wild' ? ` (★Wild=${val})` : '';
      state.scoringBanner = `Die #${d.id + 1}${wildNote}  →  +${val} Base`;
      spawnPopup(d.x, d.y - 68, '+' + val, COLORS.chipsLight, 24);
      spawnParticles(d.x, d.y - 10, 8, [COLORS.chipsLight, '#FFFFFF'], 50, 140);
      sfx.scoreStep(state.scoringStepCount, 'chips');
    }
    return;
  }

  if (step.type === 'DIE_FACE_MOD') {
    const d = step.die;
    const mod = step.mod;
    const mm = FACE_MOD_META[mod];
    if (!mm) return;

    d.hop = 1.15;
    d.flash = 1;
    d.flashColor = mm.color;
    state.scoringStepCount++;

    const gemCardCount = step.doubleGemCards ? step.doubleGemCards.length : 0;
    const gemFactor = (getTicketStacks('CRYSTALLOGRAPHER') > 0 ? 2 : 1) * Math.pow(2, gemCardCount);
    if (gemCardCount > 0) {
      for (const gc of step.doubleGemCards) {
        gc.bounce = 0.9;
        gc.flash = 0.8;
        gc.pulseColor = mm.color;
      }
    }

    if (mod === 'mult') {
      const addM = 15 * gemFactor;
      state.mult += addM;
      state.scoringBanner = `Die #${d.id + 1} Ruby Stone  →  +${addM} Mult`;
      spawnPopup(d.x, d.y - 82, `+${addM} Mult`, mm.color, 23);
      spawnParticles(d.x, d.y - 15, 14, [mm.color, '#FFFFFF'], 70, 190);
      sfx.scoreStep(state.scoringStepCount, 'mult');
    } else if (mod === 'chips') {
      const addC = 50 * gemFactor;
      state.chips += addC;
      state.scoringBanner = `Die #${d.id + 1} Sapphire Stone  →  +${addC} Base`;
      spawnPopup(d.x, d.y - 82, `+${addC} Base`, mm.color, 23);
      spawnParticles(d.x, d.y - 15, 14, [mm.color, '#FFFFFF'], 70, 190);
      sfx.scoreStep(state.scoringStepCount, 'chips');
    } else if (mod === 'gold') {
      const addG = 3 * gemFactor;
      state.money += addG;
      state.totalMoneyEarned += addG;
      state.scoringBanner = `Die #${d.id + 1} Topaz Stone  →  +$${addG}`;
      spawnPopup(d.x, d.y - 82, `+$${addG}`, mm.color, 24);
      spawnPopup(985, 65, `+$${addG}`, COLORS.goldLight, 20);
      spawnParticles(d.x, d.y - 15, 16, [mm.color, COLORS.gold, '#FFFFFF'], 70, 200);
      sfx.scoreStep(state.scoringStepCount, 'money');
    } else if (mod === 'glass') {
      const glassMul = Math.pow(2, 1 + (getTicketStacks('CRYSTALLOGRAPHER') > 0 ? 1 : 0) + gemCardCount);
      state.mult = Math.round(state.mult * glassMul * 100) / 100;
      addShake(5);
      const shattered = !!step.shattered;
      if (shattered) {
        d.mod = null;
        if (d.faces && d.faces[d.faceIndex]) {
          d.faces[d.faceIndex].mod = null;
        }
        state.scoringBanner = `Die #${d.id + 1} Emerald Stone  →  x${glassMul} Mult (SHATTERED!)`;
        spawnPopup(d.x, d.y - 88, `x${glassMul} & SHATTER!`, '#FCA5A5', 24);
        spawnParticles(d.x, d.y - 15, 28, ['#A5F3FC', '#FFFFFF', '#F87171'], 100, 280);
        sfx.error();
      } else {
        state.scoringBanner = `Die #${d.id + 1} Emerald Stone  →  x${glassMul} Mult`;
        spawnPopup(d.x, d.y - 82, `x${glassMul} Mult`, mm.color, 26);
        spawnParticles(d.x, d.y - 15, 18, [mm.color, '#FFFFFF'], 80, 220);
        sfx.scoreStep(state.scoringStepCount, 'xmult');
      }
    }
    return;
  }

  if (step.type === 'CARD_DEBUFFED') {
    const c = step.card;
    c.bounce = 0.6;
    c.flash = 1;
    c.pulseColor = COLORS.multRed;
    state.scoringBanner = 'Leftmost card disabled by ' + state.activeBoss.name;
    spawnPopup(c.x, c.y - 48, 'Debuffed', COLORS.multLight, 19);
    sfx.scoreStep(state.scoringStepCount, 'debuff');
    return;
  }

  if (step.type === 'CARD_EVENT') {
    const c = step.card;
    const ev = step.ev;
    c.bounce = 1;
    c.flash = 1;
    c.pulseColor = ev.color;
    state.scoringStepCount++;

    if (ev.dieId !== undefined) {
      const d = state.dice[ev.dieId];
      if (d) {
        d.hop = 0.7;
        d.flash = 0.8;
        d.flashColor = ev.color;
      }
    }
    if (ev.scaleAdd) {
      const targetCard = step.scaleTarget || c;
      targetCard.scalingBonus = Math.round(((targetCard.scalingBonus || 0) + ev.scaleAdd) * 100) / 100;
    }
    if (ev.chipsAdd) state.chips += ev.chipsAdd;
    if (ev.multAdd) state.mult += ev.multAdd;
    if (ev.multMul) state.mult = Math.round(state.mult * ev.multMul * 100) / 100;
    if (ev.moneyAdd) {
      state.money += ev.moneyAdd;
      state.totalMoneyEarned += ev.moneyAdd;
    }

    state.scoringBanner = step.def.name + '  →  ' + ev.label;
    spawnPopup(c.x, c.y - 52, ev.label, ev.color, ev.multMul ? 26 : 22);
    spawnParticles(c.x, c.y, ev.multMul ? 18 : 10, [ev.color, '#FFFFFF', COLORS.brassBright], 70, 210);
    if (ev.multMul) addShake(5);
    sfx.scoreStep(state.scoringStepCount, ev.sfx || 'mult');
    return;
  }

  if (step.type === 'EDITION_EVENT') {
    const c = step.card;
    c.bounce = 1.15;
    c.flash = 1;
    c.pulseColor = step.color;
    state.scoringStepCount++;
    if (step.chipsAdd) state.chips += step.chipsAdd;
    if (step.multAdd) state.mult += step.multAdd;
    if (step.multMul) state.mult = Math.round(state.mult * step.multMul * 100) / 100;

    state.scoringBanner = EDITIONS[step.edition].name + ' Edition  →  ' + step.label;
    spawnPopup(c.x, c.y - 60, step.label, step.color, 23);
    spawnParticles(c.x, c.y, 16, [step.color, '#FFFFFF', '#FDE047'], 80, 230);
    if (step.multMul) addShake(6);
    sfx.scoreStep(state.scoringStepCount, step.sfx);
    return;
  }

  if (step.type === 'ARTEFACT_EVENT') {
    const def = ARTEFACT_BY_ID[step.artefactId];
    state.scoringStepCount++;
    if (step.multAdd) state.mult = Math.max(1, Math.round((state.mult + step.multAdd) * 100) / 100);
    if (step.multMul) state.mult = Math.round(state.mult * step.multMul * 100) / 100;
    if (step.moneyAdd) {
      state.money = Math.max(0, state.money + step.moneyAdd);
      if (step.moneyAdd > 0) state.totalMoneyEarned += step.moneyAdd;
      spawnPopup(985, 65, step.moneyAdd > 0 ? `+$${step.moneyAdd}` : `-$${Math.abs(step.moneyAdd)}`, step.color, 21);
    }
    if (step.card) {
      step.card.bounce = 1.1;
      step.card.flash = 1;
      step.card.pulseColor = step.color;
      spawnPopup(step.card.x, step.card.y - 54, step.label, step.color, 25);
      spawnParticles(step.card.x, step.card.y, 16, [step.color, '#FFFFFF', '#FDE047'], 70, 220);
    } else if (step.dieId !== undefined) {
      const d = state.dice.find(x => x.id === step.dieId) || state.dice[step.dieId];
      if (d) {
        d.hop = 0.9;
        d.flash = 1;
        d.flashColor = step.color;
        spawnPopup(d.x, d.y - 72, step.label, step.color, 24);
        spawnParticles(d.x, d.y - 12, 14, [step.color, '#FFFFFF'], 70, 200);
      }
    } else {
      spawnPopup(126, 150, step.label, step.color, 24);
      spawnParticles(126, 138, 16, [step.color, '#FFFFFF'], 70, 210);
    }
    state.scoringBanner = `${def ? def.name : 'Artefact'}  →  ${step.label}`;
    addShake(5);
    sfx.scoreStep(state.scoringStepCount, step.sfx || 'xmult');
    return;
  }

  if (step.type === 'CLOTH_EVENT') {
    const cloth = CLOTH_BY_ID[step.clothId];
    state.scoringStepCount++;
    if (step.multMul) state.mult = Math.round(state.mult * step.multMul * 100) / 100;
    state.scoringBanner = `${cloth ? cloth.name : 'Cloth'}  →  ${step.label}`;
    spawnPopup(640, 520, step.label, step.color, 26);
    spawnParticles(640, 560, 20, [step.color, '#FFFFFF', '#FDE047'], 80, 230);
    addShake(6);
    sfx.scoreStep(state.scoringStepCount, step.sfx || 'xmult');
    return;
  }

  if (step.type === 'POTION_GOLD') {
    state.scoringStepCount++;
    state.money += step.moneyAdd;
    state.totalMoneyEarned += step.moneyAdd;
    state.scoringBanner = `Gilded Tonic  →  +$${step.moneyAdd}`;
    spawnPopup(985, 65, `+$${step.moneyAdd}`, COLORS.goldLight, 24);
    spawnParticles(985, 58, 18, [COLORS.goldLight, COLORS.gold, '#FFFFFF'], 70, 210);
    sfx.scoreStep(state.scoringStepCount, 'money');
    return;
  }

  if (step.type === 'POTION_MULT') {
    state.scoringStepCount++;
    state.mult = Math.round(state.mult * step.multMul * 100) / 100;
    state.potionScoreMult = 1;
    state.scoringBanner = `Strength Potion  →  x${step.multMul} Score!`;
    spawnPopup(1154, 150, `x${step.multMul} SCORE!`, '#FB7185', 28);
    spawnParticles(1154, 138, 22, ['#FB7185', '#FDA4AF', '#FFFFFF'], 80, 240);
    addShake(7);
    sfx.scoreStep(state.scoringStepCount, 'xmult');
    return;
  }

  if (step.type === 'TOTAL_SLAM') {
    const handTotal = Math.round(state.chips * state.mult);
    state.scoringHandTotal = handTotal;
    state.stageScore += handTotal;
    if (handTotal > state.bestHandScore) state.bestHandScore = handTotal;

    if (handTotal > state.stats.bestHand) {
      state.stats.bestHand = handTotal;
      saveStats(state.stats);
    }

    const beatTarget = state.stageScore >= state.targetScore;
    const hugeBlowout = handTotal >= state.targetScore;

    state.scoringBanner = fmtNum(state.chips) + ' × ' + fmtMult(state.mult) + ' = ' + fmtNum(handTotal) + (beatTarget ? '  —  CHAPTER CLEARED!' : '');
    spawnPopup(640, 310, '+' + fmtNum(handTotal), beatTarget ? COLORS.goldLight : '#FFFFFF', hugeBlowout ? 44 : 34);

    if (beatTarget) {
      addShake(hugeBlowout ? 18 : 11);
      state.hitFlash = hugeBlowout ? 0.55 : 0.3;
      spawnParticles(640, 340, hugeBlowout ? 75 : 45, [COLORS.goldLight, COLORS.emerald, COLORS.chipsLight, '#FFFFFF'], 120, 420);
      spawnParticles(480, 60, 30, [COLORS.goldLight, COLORS.emerald], 80, 260);
    } else {
      addShake(4);
      spawnParticles(640, 340, 18, [COLORS.chipsLight, COLORS.multLight, '#FFFFFF'], 80, 200);
    }
    sfx.totalSlam(beatTarget);

    if (beatTarget) {
      if (state.stage > state.stats.bestStage) {
        state.stats.bestStage = state.stage;
        saveStats(state.stats);
      }
      state.pendingAfterScore = 'CASH_OUT';
    } else if (state.handsLeft <= 0) {
      state.pendingAfterScore = 'GAME_OVER';
    } else {
      state.pendingAfterScore = 'NEXT_HAND';
    }
  }
}

export function finishScoringPhase() {
  const next = state.pendingAfterScore;
  state.pendingAfterScore = null;
  state.scoringBanner = '';

  if (next === 'CASH_OUT') {
    const baseReward = getStageBaseReward(state.stage);
    const handsBonus = state.handsLeft;
    const interest = Math.min(MAX_INTEREST, Math.floor(state.money / 5));

    let cardRerollsBonus = 0;
    let cardHandsBonus = 0;
    const cashOutCardTriggers = [];
    state.activeCards.forEach((inst, idx) => {
      if (isCardDebuffedByBoss(idx)) return;
      let curIdx = idx;
      const visited = new Set();
      let targetDef = null;
      while (curIdx >= 0 && curIdx < state.activeCards.length && !visited.has(curIdx)) {
        visited.add(curIdx);
        const def = CARD_BY_ID[state.activeCards[curIdx].cardId];
        if (!def) break;
        if (def.copyRight) {
          curIdx += 1;
          continue;
        }
        targetDef = def;
        break;
      }
      if (!targetDef) return;
      let cardEarned = 0;
      if (targetDef.cashOutRerolls) {
        const amt = state.rerollsLeft * targetDef.cashOutRerolls;
        cardRerollsBonus += amt;
        cardEarned += amt;
      }
      if (targetDef.cashOutHands) {
        const amt = state.handsLeft * targetDef.cashOutHands;
        cardHandsBonus += amt;
        cardEarned += amt;
      }
      if (cardEarned > 0) {
        cashOutCardTriggers.push({
          card: inst,
          amount: cardEarned,
          at: 0.68 + cashOutCardTriggers.length * 0.18,
          fired: false
        });
      }
    });

    const artefactBonus = (hasArtefact('GREED_CURSE') ? 5 : 0) + (hasArtefact('PUCH') ? 8 : 0);
    const clothBonus = state.selectedClothId === 'WHITE_SILK' ? Math.max(2, Math.round(baseReward * 0.5)) : 0;
    const total = baseReward + handsBonus + interest + cardRerollsBonus + cardHandsBonus + artefactBonus + clothBonus;
    state.cashOutData = {
      baseReward,
      handsBonus,
      handsCount: state.handsLeft,
      rerollsCount: state.rerollsLeft,
      cardRerollsBonus,
      cardHandsBonus,
      artefactBonus,
      clothBonus,
      cardTriggers: cashOutCardTriggers,
      interest,
      total,
      claimed: false,
      isRunVictory: state.stage === 9 && !state.endless
    };
    state.cashOutReveal = 0;
    state.mode = 'CASH_OUT';
    sfx.sellCard();
  } else if (next === 'GAME_OVER') {
    state.mode = 'GAME_OVER';
    sfx.gameOver();
  } else {
    state.mode = 'PLAYING';
    const allIndices = [];
    for (let i = 0; i < state.dice.length; i++) {
      state.dice[i].selected = false;
      allIndices.push(i);
    }
    rollDiceSet(allIndices);
  }
}

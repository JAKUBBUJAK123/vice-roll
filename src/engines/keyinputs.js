import { clamp } from './graphicEngine.js';
import { sfx } from './soundEngine.js';
import { hitTest, getActiveCardLayout } from './ui.js';

export function resizeCanvas(canvas, state, logicalW, logicalH) {
  state.vw = window.innerWidth;
  state.vh = window.innerHeight;
  state.dpr = Math.min(window.devicePixelRatio || 1, 2);
  canvas.width = Math.round(state.vw * state.dpr);
  canvas.height = Math.round(state.vh * state.dpr);
  state.scale = Math.min(state.vw / logicalW, state.vh / logicalH);
  state.ox = (state.vw - logicalW * state.scale) / 2;
  state.oy = (state.vh - logicalH * state.scale) / 2;
}

export function clientToLogical(canvas, state, clientX, clientY) {
  const rect = canvas.getBoundingClientRect();
  return {
    x: (clientX - rect.left - state.ox) / state.scale,
    y: (clientY - rect.top - state.oy) / state.scale
  };
}

export function findHoveredDieIndex(state, lx, ly) {
  for (let i = 0; i < state.dice.length; i++) {
    const d = state.dice[i];
    const liftY = d.selected ? -34 : 0;
    const cx = d.x;
    const cy = d.y + liftY;
    const halfHit = (d.renderSize || 104) * 0.55;
    if (Math.abs(lx - cx) <= halfHit && Math.abs(ly - cy) <= halfHit) return i;
  }
  return -1;
}

export function findActiveCardIndex(state, lx, ly) {
  const layout = getActiveCardLayout(state);
  for (let i = 0; i < state.activeCards.length; i++) {
    const c = state.activeCards[i];
    if (
      lx >= c.x - layout.cardW / 2 && lx <= c.x + layout.cardW / 2 &&
      ly >= c.y - layout.cardH / 2 && ly <= c.y + layout.cardH / 2
    ) {
      return i;
    }
  }
  return -1;
}

export function initInputListeners(canvas, state, actions) {
  const {
    LOGICAL_W,
    LOGICAL_H,
    startNewRun,
    toggleDieSelection,
    playSelectedHand,
    triggerReroll,
    clearSelectedDice,
    claimCashOut,
    rerollShop,
    startStage
  } = actions;

  const handleResize = () => resizeCanvas(canvas, state, LOGICAL_W, LOGICAL_H);

  canvas.addEventListener('pointerdown', (e) => {
    sfx.unlock();
    const { x, y } = clientToLogical(canvas, state, e.clientX, e.clientY);
    state.mouseX = x;
    state.mouseY = y;

    // 1. Check UI buttons (reverse order so modals on top catch first)
    for (let i = state.buttons.length - 1; i >= 0; i--) {
      const b = state.buttons[i];
      if (!b.disabled && hitTest(x, y, b.rect)) {
        b.onClick();
        return;
      }
    }

    if (state.modal) return;

    // 2. Check active modifier cards for click-focus OR drag-and-drop reorder
    if (state.mode === 'PLAYING' || state.mode === 'SHOP') {
      const cIdx = findActiveCardIndex(state, x, y);
      if (cIdx !== -1) {
        const card = state.activeCards[cIdx];
        state.drag = {
          card,
          fromIdx: cIdx,
          startX: x,
          startY: y,
          curX: x,
          curY: y,
          active: false
        };
        return;
      }
    }

    // Clicking empty space dismisses card action strip
    state.focusedActiveUid = null;

    // 3. Check dice click in PLAYING state
    if (state.mode === 'PLAYING') {
      const dIdx = findHoveredDieIndex(state, x, y);
      if (dIdx !== -1) {
        toggleDieSelection(dIdx);
        return;
      }
    }
  });

  window.addEventListener('pointermove', (e) => {
    const { x, y } = clientToLogical(canvas, state, e.clientX, e.clientY);
    state.mouseX = x;
    state.mouseY = y;

    if (state.drag) {
      state.drag.curX = x;
      state.drag.curY = y;
      if (!state.drag.active && Math.hypot(x - state.drag.startX, y - state.drag.startY) > 10) {
        state.drag.active = true;
        state.focusedActiveUid = null;
      }
      if (state.drag.active) {
        const curIdx = state.activeCards.indexOf(state.drag.card);
        if (curIdx !== -1) {
          const layout = getActiveCardLayout(state);
          const relX = x - layout.startX;
          const slotStride = layout.cardW + layout.gap;
          const desiredIdx = clamp(Math.floor(relX / slotStride), 0, state.activeCards.length - 1);
          if (desiredIdx !== curIdx) {
            state.activeCards.splice(curIdx, 1);
            state.activeCards.splice(desiredIdx, 0, state.drag.card);
            sfx.cardSnap();
          }
        }
      }
    }
  });

  window.addEventListener('pointerup', () => {
    if (state.drag) {
      if (!state.drag.active) {
        const uid = state.drag.card.uid;
        state.focusedActiveUid = state.focusedActiveUid === uid ? null : uid;
        sfx.click();
      } else {
        state.drag.card.bounce = 0.5;
        sfx.cardSnap();
      }
      state.drag = null;
    }
  });

  window.addEventListener('blur', () => {
    state.drag = null;
  });

  window.addEventListener('keydown', (e) => {
    if (e.repeat) return;
    sfx.unlock();

    if (e.key === 'Escape') {
      if (state.modal) {
        sfx.click();
        state.modal = null;
        state.workshopTarget = null;
      } else if (state.mode === 'PLAYING' || state.mode === 'SHOP') {
        sfx.click();
        state.modal = 'PAUSE';
      }
      return;
    }

    if (state.modal) return;

    if (state.mode === 'TITLE_MENU') {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        startNewRun();
      }
      return;
    }

    if (state.mode === 'PLAYING') {
      if (e.key >= '1' && e.key <= '7') {
        const idx = Number(e.key) - 1;
        if (idx < state.dice.length) {
          toggleDieSelection(idx);
        }
      } else if (e.key === ' ' || e.key === 'Enter') {
        e.preventDefault();
        playSelectedHand();
      } else if (e.key === 'r' || e.key === 'R') {
        triggerReroll();
      } else if (e.key === 'c' || e.key === 'C') {
        clearSelectedDice();
      }
      return;
    }

    if (state.mode === 'CASH_OUT') {
      if (e.key === ' ' || e.key === 'Enter') {
        e.preventDefault();
        claimCashOut();
      }
      return;
    }

    if (state.mode === 'SHOP') {
      if (e.key === 'r' || e.key === 'R') {
        rerollShop();
      } else if (e.key === ' ' || e.key === 'Enter') {
        e.preventDefault();
        startStage(state.stage + 1);
      }
    }
  });

  window.addEventListener('resize', handleResize);
  handleResize();
}

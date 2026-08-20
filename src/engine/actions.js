import { CREATURE_BY_ID } from '../data/creatures.js';
import { CONFIG, PHASES, ACTIONS, COIN_COLORS } from './constants.js';
import { makeRng, shuffle } from './rng.js';
import {
  getCurrentPlayer,
  totalCoins,
  canAffordCreature,
  qualifiesForTitle,
  computeFinalScores,
} from './selectors.js';
import { TITLE_BY_ID } from './selectors.js';

class GameError extends Error {}

function clone(state) {
  return structuredClone(state);
}

function drawRandomCoin(state, rng) {
  // Reshuffle discard into draw pile if empty.
  const drawTotal = totalCoins(state.coinDrawPile);
  if (drawTotal === 0) {
    const discardTotal = totalCoins(state.coinDiscardPile);
    if (discardTotal === 0) return null; // truly out of coins (shouldn't happen: 90 total)
    for (const c of COIN_COLORS) {
      state.coinDrawPile[c] += state.coinDiscardPile[c];
      state.coinDiscardPile[c] = 0;
    }
  }
  const total = totalCoins(state.coinDrawPile);
  let roll = rng.int(total);
  for (const c of COIN_COLORS) {
    if (roll < state.coinDrawPile[c]) {
      state.coinDrawPile[c] -= 1;
      return c;
    }
    roll -= state.coinDrawPile[c];
  }
  return null;
}

function refillCoinDisplay(state, rng) {
  while (state.coinDisplay.length < CONFIG.COIN_DISPLAY_SIZE) {
    const color = drawRandomCoin(state, rng);
    if (!color) break;
    state.coinDisplay.push(color);
  }
}

function refillVaultSlot(state, index) {
  if (state.creatureDeck.length > 0) {
    state.vault[index] = state.creatureDeck.pop();
  } else {
    state.vault[index] = null;
  }
}

function log(state, entry) {
  state.log.push({ ...entry, playerId: getCurrentPlayer(state)?.id });
  if (state.log.length > 200) state.log.shift();
}

// ---- Individual action handlers (mutate the draft, called via applyAction) ----

function takeCoin(state, { source, color }, rng) {
  if (state.phase !== PHASES.COLLECT) throw new GameError('Not in Collect phase');
  if (state.coinsCollectedThisTurn >= CONFIG.COINS_PER_TURN) {
    throw new GameError('Already collected coins this turn');
  }
  const player = getCurrentPlayer(state);
  let taken = null;
  if (source === 'display') {
    const idx = state.coinDisplay.indexOf(color);
    if (idx === -1) throw new GameError(`No ${color} coin in display`);
    state.coinDisplay.splice(idx, 1);
    taken = color;
  } else if (source === 'draw') {
    taken = drawRandomCoin(state, rng);
    if (!taken) throw new GameError('No coins left to draw');
  } else {
    throw new GameError('Invalid coin source');
  }
  player.purse[taken] += 1;
  state.coinsCollectedThisTurn += 1;
  log(state, { type: 'TAKE_COIN', source, color: taken });
  if (state.coinsCollectedThisTurn >= CONFIG.COINS_PER_TURN) {
    state.phase = PHASES.MARKET;
  }
}

function buyCreature(state, { vaultIndex, payColor }) {
  if (state.phase !== PHASES.MARKET) throw new GameError('Not in Market phase');
  const creatureId = state.vault[vaultIndex];
  if (!creatureId) throw new GameError('Empty vault slot');
  const player = getCurrentPlayer(state);
  const def = CREATURE_BY_ID[creatureId];
  if (!canAffordCreature(player.purse, creatureId)) throw new GameError('Cannot afford creature');

  if (def.color === 'any') {
    const color = payColor || COIN_COLORS.find((c) => player.purse[c] >= def.cost);
    if (!color || player.purse[color] < def.cost) throw new GameError('Invalid payment color');
    player.purse[color] -= def.cost;
    state.coinDiscardPile[color] += def.cost;
  } else {
    player.purse[def.color] -= def.cost;
    state.coinDiscardPile[def.color] += def.cost;
  }

  player.creatures.push({
    instanceId: state.nextInstanceId++,
    creatureId,
    locked: false,
    titleId: null,
  });
  refillVaultSlot(state, vaultIndex);
  log(state, { type: 'BUY_CREATURE', creatureId });
}

function clearVault(state, { payColor }, rng) {
  if (state.phase !== PHASES.MARKET) throw new GameError('Not in Market phase');
  if (state.creatureDeck.length === 0) throw new GameError('Deck empty, cannot clear');
  const player = getCurrentPlayer(state);
  const color = payColor || COIN_COLORS.find((c) => player.purse[c] >= CONFIG.CLEAR_VAULT_COST);
  if (!color || player.purse[color] < CONFIG.CLEAR_VAULT_COST) {
    throw new GameError('Cannot afford to clear vault');
  }
  player.purse[color] -= CONFIG.CLEAR_VAULT_COST;
  state.coinDiscardPile[color] += CONFIG.CLEAR_VAULT_COST;

  for (let i = 0; i < state.vault.length; i++) {
    if (state.vault[i]) state.clearedPile.push(state.vault[i]);
    state.vault[i] = null;
  }
  for (let i = 0; i < CONFIG.VAULT_SIZE; i++) {
    refillVaultSlot(state, i);
  }
  log(state, { type: 'CLEAR_VAULT' });
}

function advanceToClaim(state) {
  if (state.phase !== PHASES.MARKET) throw new GameError('Not in Market phase');
  state.phase = PHASES.CLAIM;
}

function claimTitle(state, { titleId }) {
  if (state.phase !== PHASES.CLAIM) throw new GameError('Not in Claim phase');
  const title = TITLE_BY_ID[titleId];
  if (!title) throw new GameError('Unknown title');
  if (!state.titlesAvailable.includes(titleId)) throw new GameError('Title not available');
  const player = getCurrentPlayer(state);
  if (!qualifiesForTitle(player, title)) throw new GameError('Does not qualify for title');

  const need = {};
  for (const id of title.requires) need[id] = (need[id] || 0) + 1;

  for (const [creatureId, count] of Object.entries(need)) {
    let remaining = count;
    for (const cr of player.creatures) {
      if (remaining === 0) break;
      if (!cr.locked && cr.creatureId === creatureId) {
        cr.locked = true;
        cr.titleId = titleId;
        remaining -= 1;
      }
    }
  }

  state.titlesAvailable = state.titlesAvailable.filter((id) => id !== titleId);
  player.titlesClaimed.push(titleId);
  log(state, { type: 'CLAIM_TITLE', titleId });
}

function discardCoins(state, { discard }) {
  const player = getCurrentPlayer(state);
  for (const c of COIN_COLORS) {
    const n = discard?.[c] || 0;
    if (n > player.purse[c]) throw new GameError('Cannot discard more coins than owned');
    player.purse[c] -= n;
    state.coinDiscardPile[c] += n;
  }
}

function endTurn(state, { discard } = {}, rng) {
  if (state.phase === PHASES.GAME_OVER) throw new GameError('Game already over');
  const player = getCurrentPlayer(state);

  if (totalCoins(player.purse) > CONFIG.COIN_HAND_LIMIT) {
    if (discard) discardCoins(state, { discard });
    if (totalCoins(player.purse) > CONFIG.COIN_HAND_LIMIT) {
      throw new GameError(`Must discard down to ${CONFIG.COIN_HAND_LIMIT} coins`);
    }
  }

  // Reshuffle cleared creatures back into the deck.
  if (state.clearedPile.length > 0) {
    state.creatureDeck = shuffle([...state.creatureDeck, ...state.clearedPile], rng);
    state.clearedPile = [];
  }

  player.turnsTaken += 1;

  // Check end-game trigger conditions.
  if (!state.gameEndTriggered) {
    const triggeredByTitles = player.titlesClaimed.length >= CONFIG.TITLES_TO_WIN;
    const triggeredByDeck = state.creatureDeck.length === 0 && state.vault.every((v) => !v);
    const triggeredBySafetyValve = player.turnsTaken >= CONFIG.MAX_TURNS_PER_PLAYER;
    if (triggeredByTitles || triggeredByDeck || triggeredBySafetyValve) {
      state.gameEndTriggered = true;
      state.triggerTurnsTaken = player.turnsTaken;
    }
  }

  log(state, { type: 'END_TURN' });

  // Determine if the game is now truly over (every player has had an equal
  // number of turns since the trigger fired).
  if (state.gameEndTriggered) {
    const allCaughtUp = state.players.every((p) => p.turnsTaken >= state.triggerTurnsTaken);
    if (allCaughtUp) {
      const { scores, winnerIds } = computeFinalScores(state);
      state.finalScores = scores;
      state.winnerIds = winnerIds;
      state.phase = PHASES.GAME_OVER;
      return;
    }
  }

  // Advance to next player.
  state.currentPlayerIndex = (state.currentPlayerIndex + 1) % state.players.length;
  state.phase = PHASES.COLLECT;
  state.coinsCollectedThisTurn = 0;
  refillCoinDisplay(state, rng);
}

const HANDLERS = {
  [ACTIONS.TAKE_COIN]: takeCoin,
  [ACTIONS.BUY_CREATURE]: buyCreature,
  [ACTIONS.CLEAR_VAULT]: clearVault,
  [ACTIONS.ADVANCE_TO_CLAIM]: advanceToClaim,
  [ACTIONS.CLAIM_TITLE]: claimTitle,
  [ACTIONS.DISCARD_COINS]: discardCoins,
  [ACTIONS.END_TURN]: endTurn,
};

/**
 * Apply an action to a state, returning a NEW state (does not mutate input).
 * Throws GameError on illegal moves - callers (UI/bots) should validate first
 * where possible, but this is the source of truth.
 */
export function applyAction(prevState, action) {
  const state = clone(prevState);
  const rng = makeRng(); // Math.random-backed; state itself is the source of truth once synced.
  const handler = HANDLERS[action.type];
  if (!handler) throw new GameError(`Unknown action type: ${action.type}`);
  handler(state, action.payload || {}, rng);
  return state;
}

export { GameError };

import { applyAction } from '../engine/actions.js';
import { ACTIONS, CONFIG, COIN_COLORS, PHASES } from '../engine/constants.js';
import {
  getCurrentPlayer,
  totalCoins,
  claimableTitlesForPlayer,
  availableTitleObjects,
  qualifiesForTitle,
  TITLE_BY_ID,
} from '../engine/selectors.js';
import {
  affordableVaultOptions,
  creatureValue,
  averageVaultValue,
  deckAverageValue,
  pickPaymentColor,
  titleMatchCount,
  rivalUrgencyBonus,
} from './heuristics.js';
import { CREATURE_BY_ID } from '../data/creatures.js';

export const BOT_LEVELS = ['easy', 'medium', 'hard', 'expert'];

// ---------- Coin phase ----------

function decideCoinPick(state, player, level) {
  const displayHasAny = state.coinDisplay.length > 0;

  if (level === 'easy') {
    if (displayHasAny && Math.random() < 0.6) {
      const color = state.coinDisplay[Math.floor(Math.random() * state.coinDisplay.length)];
      return { source: 'display', color };
    }
    return { source: 'draw' };
  }

  // medium / hard / expert: chase whichever color unlocks the best target creature.
  const options = state.vault
    .filter(Boolean)
    .map((id) => ({
      id,
      value:
        creatureValue(state, player, id) +
        (level === 'expert' ? rivalUrgencyBonus(state, player, id) : 0),
    }))
    .sort((a, b) => b.value - a.value);

  for (const opt of options) {
    const def = CREATURE_BY_ID[opt.id];
    if (def.color === 'any') continue;
    const shortfall = def.cost - player.purse[def.color];
    if (shortfall <= 0) continue; // already affordable
    if (state.coinDisplay.includes(def.color)) {
      return { source: 'display', color: def.color };
    }
  }
  // Nothing specific needed visibly in the display - draw randomly (better odds long-run).
  if (displayHasAny && level === 'easy') {
    return { source: 'display', color: state.coinDisplay[0] };
  }
  return { source: 'draw' };
}

// ---------- Market phase ----------

function decideMarketStep(state, player, level) {
  const canClear = state.creatureDeck.length > 0 && player.purse.fire + player.purse.sky + player.purse.forest >= CONFIG.CLEAR_VAULT_COST;

  if (level === 'easy') {
    const options = affordableVaultOptions(state, player);
    if (options.length > 0) {
      const pick = options[Math.floor(Math.random() * options.length)];
      return { action: 'buy', vaultIndex: pick.vaultIndex, creatureId: pick.creatureId };
    }
    return { action: 'stop' };
  }

  if (level === 'medium') {
    const options = state.vault
      .map((id, vaultIndex) => ({ id, vaultIndex }))
      .filter((o) => o.id)
      .map((o) => ({ ...o, points: CREATURE_BY_ID[o.id].points }))
      .filter((o) => canAffordSimple(player.purse, o.id))
      .sort((a, b) => b.points - a.points);
    if (options.length > 0) {
      return { action: 'buy', vaultIndex: options[0].vaultIndex, creatureId: options[0].id };
    }
    return { action: 'stop' };
  }

  // hard / expert: buy the best available option; only clear instead of buying
  // when the whole vault is clearly worse than what the deck likely holds.
  let options = affordableVaultOptions(state, player);
  if (level === 'expert') {
    options = options
      .map((o) => ({ ...o, value: o.value + rivalUrgencyBonus(state, player, o.creatureId) }))
      .sort((a, b) => b.value - a.value);
  }
  if (canClear) {
    const avgVault = averageVaultValue(state, player);
    const avgDeck = deckAverageValue(state);
    const bestOptionValue = options.length > 0 ? options[0].value : 0;
    if (avgVault < avgDeck - 1.5 && bestOptionValue < avgDeck) {
      return { action: 'clear' };
    }
  }
  if (options.length > 0) {
    return { action: 'buy', vaultIndex: options[0].vaultIndex, creatureId: options[0].creatureId };
  }
  return { action: 'stop' };
}

function canAffordSimple(purse, creatureId) {
  const def = CREATURE_BY_ID[creatureId];
  if (def.color === 'any') return totalCoins(purse) >= def.cost;
  return purse[def.color] >= def.cost;
}

// ---------- Claim phase ----------

function decideTitleClaims(state, player, level) {
  const qualifying = claimableTitlesForPlayer(state, player);
  if (level !== 'expert') return qualifying.map((t) => t.id);

  const keep = [];
  for (const title of qualifying) {
    const opportunity = availableTitleObjects(state).find((t2) => {
      if (t2.id === title.id) return false;
      const isSuperset = title.requires.every((id) =>
        t2.requires.filter((x) => x === id).length >=
        title.requires.filter((x) => x === id).length
      ) && t2.requires.length > title.requires.length;
      if (!isSuperset) return false;
      const { matched, needed } = titleMatchCount(player, t2);
      return needed - matched <= 1 && t2.points > title.points * 1.2;
    });
    if (opportunity && !state.gameEndTriggered && state.creatureDeck.length > 10) {
      continue; // hold back, hoping to complete the bigger title instead
    }
    keep.push(title.id);
  }
  return keep;
}

// ---------- Coin discard (end of turn, over the limit) ----------

function decideDiscard(player) {
  let excess = totalCoins(player.purse) - CONFIG.COIN_HAND_LIMIT;
  if (excess <= 0) return null;
  const discard = { fire: 0, sky: 0, forest: 0 };
  const order = [...COIN_COLORS].sort((a, b) => player.purse[b] - player.purse[a]);
  for (const c of order) {
    while (excess > 0 && discard[c] < player.purse[c]) {
      discard[c] += 1;
      excess -= 1;
    }
    if (excess <= 0) break;
  }
  return discard;
}

/**
 * Play a bot's entire turn (collect -> market -> claim -> end), returning the
 * resulting state. Pure with respect to the input state.
 */
export function runBotTurn(state, level = 'medium') {
  let s = state;
  const player = () => getCurrentPlayer(s);

  // Phase 1: Collect Coins
  let guard = 0;
  while (s.phase === PHASES.COLLECT && guard++ < 10) {
    const { source, color } = decideCoinPick(s, player(), level);
    s = applyAction(s, { type: ACTIONS.TAKE_COIN, payload: { source, color } });
  }

  // Phase 2: Creature Market Actions
  guard = 0;
  while (s.phase === PHASES.MARKET && guard++ < 15) {
    const step = decideMarketStep(s, player(), level);
    if (step.action === 'buy') {
      const def = CREATURE_BY_ID[step.creatureId];
      const payColor = def.color === 'any' ? pickPaymentColor(player().purse, def.cost) : undefined;
      s = applyAction(s, {
        type: ACTIONS.BUY_CREATURE,
        payload: { vaultIndex: step.vaultIndex, payColor },
      });
    } else if (step.action === 'clear') {
      const payColor = pickPaymentColor(player().purse, CONFIG.CLEAR_VAULT_COST);
      s = applyAction(s, { type: ACTIONS.CLEAR_VAULT, payload: { payColor } });
    } else {
      break;
    }
  }
  s = applyAction(s, { type: ACTIONS.ADVANCE_TO_CLAIM });

  // Phase 3: Claim Titles
  const titleIds = decideTitleClaims(s, player(), level);
  for (const titleId of titleIds) {
    if (qualifiesForTitle(player(), TITLE_BY_ID[titleId])) {
      s = applyAction(s, { type: ACTIONS.CLAIM_TITLE, payload: { titleId } });
    }
  }

  // End Turn (with discard if needed)
  const discard = decideDiscard(player());
  s = applyAction(s, { type: ACTIONS.END_TURN, payload: { discard } });

  return s;
}

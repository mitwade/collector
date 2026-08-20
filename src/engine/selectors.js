import { CREATURE_BY_ID } from '../data/creatures.js';
import { TITLES } from '../data/titles.js';
import { CONFIG, PHASES } from './constants.js';

export const TITLE_BY_ID = Object.fromEntries(TITLES.map((t) => [t.id, t]));

export function getCurrentPlayer(state) {
  return state.players[state.currentPlayerIndex];
}

export function totalCoins(purse) {
  return purse.fire + purse.sky + purse.forest;
}

export function unlockedCreatureCounts(player) {
  const counts = {};
  for (const cr of player.creatures) {
    if (!cr.locked) counts[cr.creatureId] = (counts[cr.creatureId] || 0) + 1;
  }
  return counts;
}

/** Does this player currently have enough UNLOCKED creatures to satisfy a title? */
export function qualifiesForTitle(player, title) {
  const need = {};
  for (const id of title.requires) need[id] = (need[id] || 0) + 1;
  const have = unlockedCreatureCounts(player);
  return Object.entries(need).every(([id, n]) => (have[id] || 0) >= n);
}

export function availableTitleObjects(state) {
  return state.titlesAvailable.map((id) => TITLE_BY_ID[id]);
}

export function claimableTitlesForPlayer(state, player) {
  return availableTitleObjects(state).filter((t) => qualifiesForTitle(player, t));
}

export function creatureCost(creatureId) {
  return CREATURE_BY_ID[creatureId].cost;
}

export function canAffordCreature(purse, creatureId) {
  const c = CREATURE_BY_ID[creatureId];
  if (c.color === 'any') {
    return totalCoins(purse) >= c.cost;
  }
  return purse[c.color] >= c.cost;
}

export function vaultHasSpace(state) {
  return state.vault.filter(Boolean).length < CONFIG.VAULT_SIZE && state.creatureDeck.length > 0;
}

export function scorePlayer(player) {
  const creaturePoints = player.creatures.reduce(
    (sum, cr) => sum + CREATURE_BY_ID[cr.creatureId].points,
    0
  );
  const titlePoints = player.titlesClaimed.reduce(
    (sum, tid) => sum + TITLE_BY_ID[tid].points,
    0
  );
  return {
    creaturePoints,
    titlePoints,
    total: creaturePoints + titlePoints,
    creatureCount: player.creatures.length,
    titleCount: player.titlesClaimed.length,
  };
}

export function computeFinalScores(state) {
  const scores = state.players.map((p) => ({ playerId: p.id, ...scorePlayer(p) }));
  let best = -Infinity;
  for (const s of scores) best = Math.max(best, s.total);
  let contenders = scores.filter((s) => s.total === best);
  if (contenders.length > 1) {
    let mostTitles = -Infinity;
    for (const s of contenders) mostTitles = Math.max(mostTitles, s.titleCount);
    contenders = contenders.filter((s) => s.titleCount === mostTitles);
  }
  if (contenders.length > 1) {
    let mostCreatures = -Infinity;
    for (const s of contenders) mostCreatures = Math.max(mostCreatures, s.creatureCount);
    contenders = contenders.filter((s) => s.creatureCount === mostCreatures);
  }
  return { scores, winnerIds: contenders.map((c) => c.playerId) };
}

export function isGameOver(state) {
  return state.phase === PHASES.GAME_OVER;
}

export function coinDisplayCounts(state) {
  const counts = { fire: 0, sky: 0, forest: 0 };
  for (const c of state.coinDisplay) counts[c]++;
  return counts;
}

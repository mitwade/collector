import { CREATURE_BY_ID, CREATURES } from '../data/creatures.js';
import {
  unlockedCreatureCounts,
  availableTitleObjects,
  canAffordCreature,
  totalCoins,
} from '../engine/selectors.js';

/** How many of a title's requirement the player already has unlocked (capped per-type at need). */
export function titleMatchCount(player, title) {
  const need = {};
  for (const id of title.requires) need[id] = (need[id] || 0) + 1;
  const have = unlockedCreatureCounts(player);
  let matched = 0;
  for (const [id, n] of Object.entries(need)) {
    matched += Math.min(n, have[id] || 0);
  }
  return { matched, needed: title.requires.length, need };
}

/**
 * Rough value of acquiring one more copy of `creatureId`, blending raw
 * point value with progress toward available titles that want it.
 */
export function creatureValue(state, player, creatureId) {
  const def = CREATURE_BY_ID[creatureId];
  let value = def.points;
  for (const title of availableTitleObjects(state)) {
    if (!title.requires.includes(creatureId)) continue;
    const { matched, needed } = titleMatchCount(player, title);
    if (matched >= needed) continue; // already qualifies, no marginal benefit from this axis
    // Simulate adding one more of this creature.
    const need = {};
    for (const id of title.requires) need[id] = (need[id] || 0) + 1;
    const have = unlockedCreatureCounts(player);
    const before = Math.min(need[creatureId] || 0, have[creatureId] || 0);
    const after = Math.min(need[creatureId] || 0, (have[creatureId] || 0) + 1);
    if (after > before) {
      const closeness = (matched + 1) / needed; // reward near-complete titles more
      value += (title.points / needed) * closeness;
    }
  }
  return value;
}

/** List of {vaultIndex, creatureId, value} the player can currently afford, best first. */
export function affordableVaultOptions(state, player) {
  const options = [];
  state.vault.forEach((creatureId, vaultIndex) => {
    if (!creatureId) return;
    if (!canAffordCreature(player.purse, creatureId)) return;
    options.push({ vaultIndex, creatureId, value: creatureValue(state, player, creatureId) });
  });
  options.sort((a, b) => b.value - a.value);
  return options;
}

/** Average point value of creatures remaining in the deck (rough market quality signal). */
export function deckAverageValue(state) {
  if (state.creatureDeck.length === 0) return 0;
  const sum = state.creatureDeck.reduce((s, id) => s + CREATURE_BY_ID[id].points, 0);
  return sum / state.creatureDeck.length;
}

export function averageVaultValue(state, player) {
  const present = state.vault.filter(Boolean);
  if (present.length === 0) return 0;
  return present.reduce((s, id) => s + creatureValue(state, player, id), 0) / present.length;
}

/** Pick which color to spend for an 'any' cost creature (Centaur): least useful surplus color. */
export function pickPaymentColor(purse, cost) {
  const colors = ['fire', 'sky', 'forest'];
  const affordable = colors.filter((c) => purse[c] >= cost);
  if (affordable.length === 0) return null;
  // Spend from the color we have the most of (keeps variety available).
  affordable.sort((a, b) => purse[b] - purse[a]);
  return affordable[0];
}

/** Which color is most useful to collect right now, given the best target creature. */
export function mostNeededColor(state, player) {
  const options = affordableAndNearAffordable(state, player);
  if (options.length === 0) return null;
  const top = options[0];
  const def = CREATURE_BY_ID[top.creatureId];
  if (def.color === 'any') return null; // any color works
  return def.color;
}

function affordableAndNearAffordable(state, player) {
  const all = [];
  state.vault.forEach((creatureId) => {
    if (!creatureId) return;
    all.push({ creatureId, value: creatureValue(state, player, creatureId) });
  });
  all.sort((a, b) => b.value - a.value);
  return all;
}

export const ALL_CREATURE_IDS = CREATURES.map((c) => c.id);

/**
 * Extra urgency for creatures that let the bot beat a rival to a contested
 * title (deny/race dynamics) - used by the "expert" tier only.
 */
export function rivalUrgencyBonus(state, player, creatureId) {
  let bonus = 0;
  for (const title of availableTitleObjects(state)) {
    if (!title.requires.includes(creatureId)) continue;
    const self = titleMatchCount(player, title);
    if (self.matched >= self.needed) continue;
    for (const other of state.players) {
      if (other.id === player.id) continue;
      const rival = titleMatchCount(other, title);
      if (rival.needed - rival.matched <= 1 && rival.matched > self.matched) {
        // A rival is one creature away and ahead of us - grabbing this
        // creature both helps us and denies/delays them.
        bonus += title.points * 0.5;
      }
    }
  }
  return bonus;
}

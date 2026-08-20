import { CREATURES } from '../data/creatures.js';
import { TITLES, TITLE_REVEAL_COUNT } from '../data/titles.js';
import { CONFIG, PHASES, COIN_COLORS } from './constants.js';
import { makeRng, shuffle } from './rng.js';

function buildCreatureDeck(rng) {
  const deck = [];
  for (const c of CREATURES) {
    for (let i = 0; i < c.count; i++) deck.push(c.id);
  }
  return shuffle(deck, rng);
}

function buildCoinBag(rng) {
  const bag = [];
  for (const color of COIN_COLORS) {
    for (let i = 0; i < CONFIG.COINS_PER_COLOR; i++) bag.push(color);
  }
  return shuffle(bag, rng);
}

function bagToCounts(bag) {
  const counts = { fire: 0, sky: 0, forest: 0 };
  for (const color of bag) counts[color]++;
  return counts;
}

/**
 * @param {Array<{id:string, name:string, isBot?:boolean, botLevel?:string}>} playerConfigs
 * @param {number} [seed]
 */
export function createInitialState(playerConfigs, seed) {
  if (playerConfigs.length < 2 || playerConfigs.length > 6) {
    throw new Error('Collector supports 2-6 players');
  }
  const rng = makeRng(seed);

  // --- Creatures ---
  const creatureDeck = buildCreatureDeck(rng);
  const vault = [];
  for (let i = 0; i < CONFIG.VAULT_SIZE; i++) {
    vault.push(creatureDeck.pop());
  }

  // --- Titles ---
  const revealCount = TITLE_REVEAL_COUNT[playerConfigs.length];
  const shuffledTitleIds = shuffle(TITLES.map((t) => t.id), rng);
  const titlesAvailable = shuffledTitleIds.slice(0, revealCount);
  const titlesSetAside = shuffledTitleIds.slice(revealCount);

  // --- Coins ---
  let coinBag = buildCoinBag(rng);
  let nextInstanceId = 1;

  const players = playerConfigs.map((cfg) => {
    const purse = { fire: 0, sky: 0, forest: 0 };
    for (const color of COIN_COLORS) {
      for (let i = 0; i < CONFIG.STARTING_COINS_PER_COLOR; i++) {
        const idx = coinBag.indexOf(color);
        if (idx >= 0) coinBag.splice(idx, 1);
        purse[color] += 1;
      }
    }
    return {
      id: cfg.id,
      name: cfg.name,
      isBot: !!cfg.isBot,
      botLevel: cfg.botLevel || null,
      purse,
      creatures: [], // { instanceId, creatureId, locked, titleId }
      titlesClaimed: [], // title ids
      turnsTaken: 0,
    };
  });

  const coinDisplay = [];
  for (let i = 0; i < CONFIG.COIN_DISPLAY_SIZE; i++) {
    if (coinBag.length === 0) break;
    coinDisplay.push(coinBag.pop());
  }

  const coinDrawPile = bagToCounts(coinBag);

  return {
    seed: seed ?? null,
    rngCounter: 0,
    players,
    currentPlayerIndex: 0,
    phase: PHASES.COLLECT,
    coinsCollectedThisTurn: 0,
    creatureDeck,
    vault,
    clearedPile: [],
    coinDrawPile,
    coinDiscardPile: { fire: 0, sky: 0, forest: 0 },
    coinDisplay,
    titlesAvailable,
    titlesSetAside,
    nextInstanceId,
    log: [{ type: 'GAME_START', players: players.map((p) => p.name) }],
    gameEndTriggered: false,
    triggerTurnsTaken: null,
    pendingCoinDiscard: false,
    winnerIds: null,
    finalScores: null,
  };
}

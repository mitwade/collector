import { createInitialState } from '../src/engine/setup.js';
import { runBotTurn } from '../src/bots/index.js';
import { PHASES } from '../src/engine/constants.js';
import { scorePlayer } from '../src/engine/selectors.js';

const LEVELS = ['easy', 'medium', 'hard', 'expert'];

function randomLevel() {
  return LEVELS[Math.floor(Math.random() * LEVELS.length)];
}

function playOneGame(numPlayers) {
  const players = Array.from({ length: numPlayers }, (_, i) => ({
    id: `p${i}`,
    name: `Bot${i}`,
    isBot: true,
    botLevel: randomLevel(),
  }));
  let state = createInitialState(players);
  let turns = 0;
  const maxTurns = 5000;
  while (state.phase !== PHASES.GAME_OVER && turns < maxTurns) {
    const level = state.players[state.currentPlayerIndex].botLevel;
    state = runBotTurn(state, level);
    turns++;
  }
  if (turns >= maxTurns) {
    throw new Error('Game did not terminate - possible infinite loop');
  }
  return { state, turns };
}

let totalGames = 0;
let failures = 0;
const summary = [];

for (const numPlayers of [2, 3, 4, 5, 6]) {
  for (let i = 0; i < 20; i++) {
    totalGames++;
    try {
      const { state, turns } = playOneGame(numPlayers);
      const scores = state.finalScores
        .map((s) => `${s.playerId}:${s.total}(cr${s.creaturePoints}+ti${s.titlePoints}, titles=${s.titleCount})`)
        .join(' | ');
      summary.push(`OK  players=${numPlayers} turns=${turns} winners=${state.winnerIds} :: ${scores}`);
    } catch (e) {
      failures++;
      summary.push(`FAIL players=${numPlayers}: ${e.stack}`);
    }
  }
}

console.log(summary.join('\n'));
console.log(`\n${totalGames - failures}/${totalGames} games completed without errors.`);
if (failures > 0) process.exit(1);

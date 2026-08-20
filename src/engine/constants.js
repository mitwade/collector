export const PHASES = {
  COLLECT: 'collect',
  MARKET: 'market',
  CLAIM: 'claim',
  GAME_OVER: 'gameover',
};

export const COIN_COLORS = ['fire', 'sky', 'forest'];

export const CONFIG = {
  COINS_PER_COLOR: 30,
  COINS_PER_TURN: 3,
  STARTING_COINS_PER_COLOR: 1,
  COIN_DISPLAY_SIZE: 5,
  COIN_HAND_LIMIT: 20,
  VAULT_SIZE: 3,
  TITLES_TO_WIN: 3,
  CLEAR_VAULT_COST: 1,
  // Safety valve: a real game finishes in well under this many turns per
  // player. Forces end-game if something (e.g. very conservative play)
  // stalls the normal end conditions indefinitely.
  MAX_TURNS_PER_PLAYER: 60,
};

export const ACTIONS = {
  TAKE_COIN: 'TAKE_COIN',
  BUY_CREATURE: 'BUY_CREATURE',
  CLEAR_VAULT: 'CLEAR_VAULT',
  ADVANCE_TO_CLAIM: 'ADVANCE_TO_CLAIM',
  CLAIM_TITLE: 'CLAIM_TITLE',
  DISCARD_COINS: 'DISCARD_COINS',
  END_TURN: 'END_TURN',
};

// Collector's Almanac — creature roster.
// NOTE: Sphinx -> Harpy and Ogre -> Dryad per house re-theme (art + name only,
// stats/costs/counts are unchanged from the original rulebook).

export const COLORS = {
  FIRE: 'fire',
  SKY: 'sky',
  FOREST: 'forest',
  ANY: 'any',
};

export const COLOR_LABELS = {
  [COLORS.FIRE]: 'Fire',
  [COLORS.SKY]: 'Sky',
  [COLORS.FOREST]: 'Forest',
  [COLORS.ANY]: 'Any',
};

// id must be stable — used as the creature "type" everywhere (titles, saves, etc).
export const CREATURES = [
  { id: 'dragon', name: 'Dragon', color: COLORS.FIRE, points: 10, cost: 5, count: 1, image: 'dragon.png' },
  { id: 'griffin', name: 'Griffin', color: COLORS.SKY, points: 9, cost: 5, count: 2, image: 'griffin.png' },
  { id: 'unicorn', name: 'Unicorn', color: COLORS.FOREST, points: 8, cost: 4, count: 3, image: 'unicorn.png' },
  { id: 'phoenix', name: 'Phoenix', color: COLORS.FIRE, points: 7, cost: 4, count: 4, image: 'phoenix.png' },
  { id: 'goblin', name: 'Goblin', color: COLORS.FOREST, points: 6, cost: 3, count: 5, image: 'goblin.png' },
  { id: 'harpy', name: 'Harpy', color: COLORS.SKY, points: 5, cost: 3, count: 6, image: 'harpy.png' },
  { id: 'pegasus', name: 'Pegasus', color: COLORS.SKY, points: 4, cost: 2, count: 7, image: 'pegasus.png' },
  { id: 'fairy', name: 'Fairy', color: COLORS.FIRE, points: 3, cost: 2, count: 8, image: 'fairy.png' },
  { id: 'dryad', name: 'Dryad', color: COLORS.FOREST, points: 2, cost: 1, count: 9, image: 'dryad.png' },
  { id: 'centaur', name: 'Centaur', color: COLORS.ANY, points: 1, cost: 1, count: 10, image: 'centaur.png' },
];

export const CREATURE_BY_ID = Object.fromEntries(CREATURES.map((c) => [c.id, c]));

export const TOTAL_CREATURE_COUNT = CREATURES.reduce((sum, c) => sum + c.count, 0); // 55

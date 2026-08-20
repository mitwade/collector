// Small deterministic PRNG (mulberry32) so game state can be seeded/reproduced.
// Each engine function takes an `rng` object with .next() -> float in [0,1)
// and .int(n) -> integer in [0,n). Falls back to Math.random-backed rng if no seed given.

export function makeRng(seed) {
  if (seed === undefined || seed === null) {
    return {
      next: () => Math.random(),
      int: (n) => Math.floor(Math.random() * n),
    };
  }
  let a = seed >>> 0;
  const next = () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  return {
    next,
    int: (n) => Math.floor(next() * n),
  };
}

export function shuffle(array, rng) {
  const arr = array.slice();
  for (let i = arr.length - 1; i > 0; i--) {
    const j = rng.int(i + 1);
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

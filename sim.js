export const DEFAULTS = {
  size: 36,
  seed: 42,
  seedDensity: 0.26,
  baseStrength: 0.82,
  strengthJitter: 0.24,
  agingSpeed: 0.03,
  inheritance: 0.92,
  resilience: 0.1,
  perturbation: 0.08,
};

const STRENGTH_PRECISION = 1_000_000;

export function clamp(value, min = 0, max = 1) {
  return Math.min(max, Math.max(min, value));
}

export function quantizeStrength(value) {
  return Math.round(clamp(value) * STRENGTH_PRECISION) / STRENGTH_PRECISION;
}

export function normalizeSeed(seed) {
  const text = String(seed);
  let hash = 1779033703 ^ text.length;
  for (let index = 0; index < text.length; index += 1) {
    hash = Math.imul(hash ^ text.charCodeAt(index), 3432918353);
    hash = (hash << 13) | (hash >>> 19);
  }

  return (hash >>> 0) || 1;
}

export function createRng(seed) {
  let state = normalizeSeed(seed);
  return () => {
    state |= 0;
    state = (state + 0x6d2b79f5) | 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t ^= t + Math.imul(t ^ (t >>> 7), 61 | t);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function createDeadCell() {
  return { alive: false, strength: 0, age: 0 };
}

export function cloneGrid(grid) {
  return grid.map((row) => row.map((cell) => ({ ...cell })));
}

export function createInitialGrid(options = {}) {
  const config = { ...DEFAULTS, ...options };
  const rng = createRng(config.seed);

  return Array.from({ length: config.size }, () =>
    Array.from({ length: config.size }, () => {
      if (rng() >= config.seedDensity) {
        return createDeadCell();
      }

      return {
        alive: true,
        age: 0,
        strength: quantizeStrength(
          config.baseStrength + (rng() - 0.5) * config.strengthJitter,
        ),
      };
    }),
  );
}

export function applyPerturbation(grid, amount = DEFAULTS.perturbation) {
  const next = cloneGrid(grid);
  const size = next.length;
  const center = Math.floor(size / 2);
  const target = next[center][center];

  if (target.alive) {
    target.strength = quantizeStrength(target.strength + amount);
    target.age = Math.max(0, target.age - 1);
    return next;
  }

  next[center][center] = {
    alive: true,
    age: 0,
    strength: quantizeStrength(0.55 + amount),
  };
  return next;
}

function collectNeighbors(grid, x, y) {
  const size = grid.length;
  let aliveCount = 0;
  let strengthSum = 0;

  for (let deltaY = -1; deltaY <= 1; deltaY += 1) {
    for (let deltaX = -1; deltaX <= 1; deltaX += 1) {
      if (deltaX === 0 && deltaY === 0) {
        continue;
      }

      const neighbor = grid[(y + deltaY + size) % size][(x + deltaX + size) % size];
      if (!neighbor.alive) {
        continue;
      }

      aliveCount += 1;
      strengthSum += neighbor.strength;
    }
  }

  return { aliveCount, strengthSum };
}

function maxAgeFor(config) {
  return Math.max(4, Math.round(1.8 / Math.max(config.agingSpeed, 0.01)));
}

export function stepGrid(grid, options = {}) {
  const config = { ...DEFAULTS, ...options };
  const next = Array.from({ length: grid.length }, () =>
    Array.from({ length: grid.length }, () => createDeadCell()),
  );
  const maxAge = maxAgeFor(config);

  for (let y = 0; y < grid.length; y += 1) {
    for (let x = 0; x < grid.length; x += 1) {
      const current = grid[y][x];
      const { aliveCount, strengthSum } = collectNeighbors(grid, x, y);
      const averageStrength = aliveCount > 0 ? strengthSum / aliveCount : 0;

      if (!current.alive) {
        if (aliveCount === 3) {
          const inheritedStrength = quantizeStrength(averageStrength * config.inheritance);
          if (inheritedStrength > 0.05) {
            next[y][x] = { alive: true, age: 0, strength: inheritedStrength };
          }
        }
        continue;
      }

      if (aliveCount !== 2 && aliveCount !== 3) {
        continue;
      }

      const age = current.age + 1;
      const senescencePenalty = age * config.agingSpeed * 0.015;
      const strength = quantizeStrength(
        current.strength * (1 - config.agingSpeed) +
          averageStrength * config.resilience -
          senescencePenalty,
      );

      if (age > maxAge || strength <= 0.05) {
        continue;
      }

      next[y][x] = { alive: true, age, strength };
    }
  }

  return next;
}

export function createScenarioPair(options = {}) {
  const config = { ...DEFAULTS, ...options };
  const left = createInitialGrid(config);
  const right = applyPerturbation(left, config.perturbation);
  return { left, right };
}

export function measureDivergence(left, right) {
  let total = 0;
  const size = left.length;

  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      const a = left[y][x];
      const b = right[y][x];
      total += Math.abs(a.strength - b.strength);
      if (a.alive !== b.alive) {
        total += 0.25;
      }
    }
  }

  return total / (size * size);
}

export function summarizeGrid(grid) {
  let alive = 0;
  let totalStrength = 0;
  let totalAge = 0;

  for (const row of grid) {
    for (const cell of row) {
      if (!cell.alive) {
        continue;
      }

      alive += 1;
      totalStrength += cell.strength;
      totalAge += cell.age;
    }
  }

  return {
    alive,
    averageAge: alive > 0 ? totalAge / alive : 0,
    averageStrength: alive > 0 ? totalStrength / alive : 0,
  };
}

export function estimateLyapunov(distances) {
  const usable = distances
    .map((distance, step) => ({ step, value: distance }))
    .filter(({ step, value }) => step > 0 && value > 1e-9 && value < 0.95);

  if (usable.length < 2) {
    return 0;
  }

  let sumX = 0;
  let sumY = 0;
  let sumXY = 0;
  let sumXX = 0;

  for (const point of usable) {
    const x = point.step;
    const y = Math.log(point.value);
    sumX += x;
    sumY += y;
    sumXY += x * y;
    sumXX += x * x;
  }

  const denominator = usable.length * sumXX - sumX * sumX;
  if (denominator === 0) {
    return 0;
  }

  return (usable.length * sumXY - sumX * sumY) / denominator;
}

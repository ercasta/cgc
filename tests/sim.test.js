import test from "node:test";
import assert from "node:assert/strict";

import {
  applyPerturbation,
  createDeadCell,
  createScenarioPair,
  estimateLyapunov,
  measureDivergence,
  quantizeStrength,
  stepGrid,
} from "../sim.js";

function deadGrid(size) {
  return Array.from({ length: size }, () =>
    Array.from({ length: size }, () => createDeadCell()),
  );
}

test("offspring inherit the average parental strength proportionally", () => {
  const grid = deadGrid(3);
  grid[0][1] = { alive: true, age: 0, strength: 0.4 };
  grid[1][0] = { alive: true, age: 0, strength: 0.7 };
  grid[1][2] = { alive: true, age: 0, strength: 0.9 };

  const next = stepGrid(grid, { inheritance: 0.8, agingSpeed: 0.05, resilience: 0 });
  assert.equal(next[1][1].alive, true);
  assert.equal(next[1][1].strength, quantizeStrength(((0.4 + 0.7 + 0.9) / 3) * 0.8));
});

test("initial perturbation creates deterministic divergence", () => {
  const scenarios = createScenarioPair({ size: 9, seed: 12, perturbation: 0.11 });
  const divergence = measureDivergence(scenarios.left, scenarios.right);

  assert.ok(divergence > 0);
  assert.deepEqual(applyPerturbation(scenarios.left, 0.11), scenarios.right);
});

test("zero perturbation leaves both grids identical and evolving in lockstep", () => {
  const scenarios = createScenarioPair({ size: 9, seed: 12, perturbation: 0 });
  assert.deepEqual(scenarios.right, scenarios.left);
  assert.equal(measureDivergence(scenarios.left, scenarios.right), 0);

  let left = scenarios.left;
  let right = scenarios.right;
  for (let step = 0; step < 10; step += 1) {
    left = stepGrid(left);
    right = stepGrid(right);
    assert.deepEqual(right, left);
  }
});

test("lyapunov estimator reports positive growth for expanding distances", () => {
  const exponent = estimateLyapunov([0.01, 0.02, 0.04, 0.08, 0.16]);
  assert.ok(exponent > 0.65 && exponent < 0.75);
});

#!/usr/bin/env node

import {
  DEFAULTS,
  createScenarioPair,
  estimateLyapunov,
  measureDivergence,
  stepGrid,
  summarizeGrid,
} from "./sim.js";

function printHelp() {
  console.log(`Conway's Game of Chaos CLI

Usage:
  node cli.js [options]

Options:
  --steps <n>          number of steps to simulate (default: 80)
  --size <n>           square grid size (default: ${DEFAULTS.size})
  --seed <value>       deterministic seed (default: ${DEFAULTS.seed})
  --density <0..1>     initial live-cell density (default: ${DEFAULTS.seedDensity})
  --strength <0..1>    initial base strength (default: ${DEFAULTS.baseStrength})
  --aging <0..1>       aging speed (default: ${DEFAULTS.agingSpeed})
  --inheritance <0..1> offspring inheritance factor (default: ${DEFAULTS.inheritance})
  --perturbation <v>   right-grid initial perturbation (default: ${DEFAULTS.perturbation})
  --trace              print per-step metrics
  --help               show this help
`);
}

function readNumber(token, nextValue) {
  if (nextValue === undefined) {
    throw new Error(`Missing value for ${token}`);
  }

  const value = Number(nextValue);
  if (Number.isNaN(value)) {
    throw new Error(`Invalid numeric value for ${token}: ${nextValue}`);
  }

  return value;
}

function parseArgs(argv) {
  const options = {
    steps: 80,
    trace: false,
    size: DEFAULTS.size,
    seed: DEFAULTS.seed,
    seedDensity: DEFAULTS.seedDensity,
    baseStrength: DEFAULTS.baseStrength,
    agingSpeed: DEFAULTS.agingSpeed,
    inheritance: DEFAULTS.inheritance,
    perturbation: DEFAULTS.perturbation,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    const nextValue = argv[index + 1];

    switch (token) {
      case "--steps":
        options.steps = readNumber(token, nextValue);
        index += 1;
        break;
      case "--size":
        options.size = readNumber(token, nextValue);
        index += 1;
        break;
      case "--seed":
        if (nextValue === undefined) {
          throw new Error("Missing value for --seed");
        }
        options.seed = nextValue;
        index += 1;
        break;
      case "--density":
        options.seedDensity = readNumber(token, nextValue);
        index += 1;
        break;
      case "--strength":
        options.baseStrength = readNumber(token, nextValue);
        index += 1;
        break;
      case "--aging":
        options.agingSpeed = readNumber(token, nextValue);
        index += 1;
        break;
      case "--inheritance":
        options.inheritance = readNumber(token, nextValue);
        index += 1;
        break;
      case "--perturbation":
        options.perturbation = readNumber(token, nextValue);
        index += 1;
        break;
      case "--trace":
        options.trace = true;
        break;
      case "--help":
        options.help = true;
        break;
      default:
        throw new Error(`Unknown argument: ${token}`);
    }
  }

  return options;
}

function printTraceRow(step, left, right, divergence) {
  const leftSummary = summarizeGrid(left);
  const rightSummary = summarizeGrid(right);
  console.log(
    [
      step,
      leftSummary.alive,
      leftSummary.averageStrength.toFixed(6),
      leftSummary.averageAge.toFixed(4),
      rightSummary.alive,
      rightSummary.averageStrength.toFixed(6),
      rightSummary.averageAge.toFixed(4),
      divergence.toFixed(6),
    ].join(","),
  );
}

function main() {
  const options = parseArgs(process.argv.slice(2));
  if (options.help) {
    printHelp();
    return;
  }

  const { steps, trace, ...simulationOptions } = options;
  let { left, right } = createScenarioPair(simulationOptions);
  const distances = [measureDivergence(left, right)];

  if (trace) {
    console.log(
      "step,left_alive,left_avg_strength,left_avg_age,right_alive,right_avg_strength,right_avg_age,divergence",
    );
    printTraceRow(0, left, right, distances[0]);
  }

  for (let step = 1; step <= steps; step += 1) {
    left = stepGrid(left, simulationOptions);
    right = stepGrid(right, simulationOptions);
    const divergence = measureDivergence(left, right);
    distances.push(divergence);

    if (trace) {
      printTraceRow(step, left, right, divergence);
    }
  }

  const leftSummary = summarizeGrid(left);
  const rightSummary = summarizeGrid(right);
  const lyapunov = estimateLyapunov(distances);

  console.log("");
  console.log(`seed: ${simulationOptions.seed}`);
  console.log(`steps: ${steps}`);
  console.log(`left alive: ${leftSummary.alive}`);
  console.log(`right alive: ${rightSummary.alive}`);
  console.log(`final divergence: ${distances[distances.length - 1].toFixed(6)}`);
  console.log(`estimated lyapunov exponent: ${lyapunov.toFixed(6)} per step`);
}

try {
  main();
} catch (error) {
  console.error(error.message);
  console.error("Use --help to see supported options.");
  process.exitCode = 1;
}

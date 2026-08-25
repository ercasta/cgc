import {
  createScenarioPair,
  estimateLyapunov,
  measureDivergence,
  stepGrid,
  summarizeGrid,
} from "./sim.js";

const form = document.querySelector("#controls");
const playButton = document.querySelector("#play");
const stepButton = document.querySelector("#step");
const resetButton = document.querySelector("#reset");
const randomizeButton = document.querySelector("#randomize-seed");
const leftCanvas = document.querySelector("#grid-left");
const rightCanvas = document.querySelector("#grid-right");
const leftMetrics = document.querySelector("#metrics-left");
const rightMetrics = document.querySelector("#metrics-right");
const globalMetrics = document.querySelector("#global-metrics");

const leftContext = leftCanvas.getContext("2d");
const rightContext = rightCanvas.getContext("2d");

let timer = null;
let state = null;

function readOptions() {
  const formData = new FormData(form);
  return {
    size: Number(formData.get("size")),
    seed: formData.get("seed"),
    seedDensity: Number(formData.get("seedDensity")),
    baseStrength: Number(formData.get("baseStrength")),
    agingSpeed: Number(formData.get("agingSpeed")),
    inheritance: Number(formData.get("inheritance")),
    perturbation: Number(formData.get("perturbation")),
    speedMs: Number(formData.get("speedMs")),
  };
}

function renderGrid(context, grid) {
  const size = grid.length;
  const cellSize = context.canvas.width / size;
  context.clearRect(0, 0, context.canvas.width, context.canvas.height);

  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      const cell = grid[y][x];
      if (!cell.alive) {
        context.fillStyle = "#000000";
      } else {
        const hue = 210;
        const ageFade = Math.max(0, 1 - cell.age / 30);
        const saturation = Math.round((60 + cell.strength * 30) * ageFade);
        const lightness = Math.round((10 + cell.strength * 55) * ageFade);
        context.fillStyle = `hsl(${hue} ${saturation}% ${lightness}%)`;
      }

      context.fillRect(x * cellSize, y * cellSize, cellSize - 1, cellSize - 1);
    }
  }
}

function formatMetrics(summary) {
  return `alive ${summary.alive} · avg strength ${summary.averageStrength.toFixed(3)} · avg age ${summary.averageAge.toFixed(2)}`;
}

function render() {
  renderGrid(leftContext, state.left);
  renderGrid(rightContext, state.right);

  const leftSummary = summarizeGrid(state.left);
  const rightSummary = summarizeGrid(state.right);
  const divergence = state.distances[state.distances.length - 1];
  const lyapunov = estimateLyapunov(state.distances);

  leftMetrics.textContent = formatMetrics(leftSummary);
  rightMetrics.textContent = formatMetrics(rightSummary);
  globalMetrics.textContent = `step ${state.step} · divergence ${divergence.toFixed(4)} · est. Lyapunov ${lyapunov.toFixed(5)} / step`;
}

function advance() {
  state.left = stepGrid(state.left, state.options);
  state.right = stepGrid(state.right, state.options);
  state.step += 1;
  state.distances.push(measureDivergence(state.left, state.right));
  render();
}

function stop() {
  if (timer !== null) {
    clearInterval(timer);
    timer = null;
  }

  playButton.textContent = "Run";
}

function start() {
  stop();
  timer = setInterval(advance, state.options.speedMs);
  playButton.textContent = "Pause";
}

function reset() {
  const options = readOptions();
  const scenarios = createScenarioPair(options);
  state = {
    ...scenarios,
    options,
    step: 0,
    distances: [measureDivergence(scenarios.left, scenarios.right)],
  };
  render();
}

playButton.addEventListener("click", () => {
  if (timer === null) {
    start();
    return;
  }

  stop();
});

stepButton.addEventListener("click", () => {
  stop();
  advance();
});

resetButton.addEventListener("click", () => {
  stop();
  reset();
});

randomizeButton.addEventListener("click", () => {
  form.elements.seed.value = Math.floor(Math.random() * 1_000_000);
  stop();
  reset();
});

form.addEventListener("submit", (event) => {
  event.preventDefault();
  stop();
  reset();
});

reset();

# cgc

Conway's Game of Chaos: a browser and workstation-friendly Conway variant where cells carry strength, age over time, die, and pass proportional strength to their offspring.

Strength is modeled as floating-point and quantized after each update so the browser and CLI remain reproducible while still supporting smooth inheritance dynamics.

## Browser mode

The repository root is a static site that can be published directly with GitHub Pages.

It is live at [https://ercasta.github.io/cgc/](https://ercasta.github.io/cgc/).

To run it locally:

```bash
npm run serve
```

Then open `http://localhost:8000`.

The page includes:

- a left settings panel
- two synchronized grids seeded from the same world
- a configurable initial perturbation for the right-hand scenario
- live divergence metrics so the chaotic split is visible

## Workstation / tracing mode

Run the CLI simulator to trace both scenarios and estimate a finite-time Lyapunov exponent:

```bash
npm run simulate -- --steps 120 --trace --seed 42 --perturbation 0.08
```

Useful flags:

- `--steps <n>`
- `--size <n>`
- `--seed <value>`
- `--density <0..1>`
- `--strength <0..1>`
- `--aging <0..1>`
- `--inheritance <0..1>`
- `--perturbation <0..1>`
- `--trace`
- `--help`

## Tests

```bash
npm test
```

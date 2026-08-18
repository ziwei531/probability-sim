# Probability Sim ☘️

A minimalist coin-flip probability simulator. Click the coin — heads or tails.

## Features

- Flip a coin with a click
- **Gacha Simulator** tab — set an SSR rate and pull ten cards (SSR / SR / R
  distribution, exact per-pull odds) over a bundled Waifu.im artwork, so the
  simulator makes no runtime image requests
- Configure the heads/tails percentage — the other side reflects
  automatically (always sums to exactly 100)
- Meticulous float-safe math (integer basis points, no drift)
- Zero dependencies, vanilla HTML + CSS + JavaScript

## Live

Published with GitHub Pages via GitHub Actions:
https://ziwei531.github.io/probability-sim/

## Development

```bash
# nothing to install — open index.html, or:
python3 -m http.server 8000
```

## Conventions

See `AGENTS.md` → `context/zw-js-coding-preference.md`.

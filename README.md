# Probability Sim ☘️

Two probability simulators in one tiny static site — a coin flip and a gacha
pull — built with vanilla HTML, CSS, and JavaScript. No frameworks, no build
step, no runtime API calls.

**Live:** https://ziwei531.github.io/probability-sim/

## Tools

### Coin Flip

- Click the coin (or focus it and press Enter/Space) to toss
- Configure the heads/tails percentages — the other side mirrors so the pair
  always sums to exactly 100%
- Float-safe math: percentages live as integer basis points, so the display
  never drifts
- Heads/tails counter resets only when a percentage actually changes
- The toss is locked while in flight — rapid clicks can't queue flips

### Gacha Simulator

- Set an SSR probability (0–100%, decimals welcome) and pull 10 cards
- Each pull rolls independently: SSR at your configured rate, SR takes 20% of
  the remainder, R takes the rest
- Rarity is assigned before artwork — the image never determines rarity
- One bundled Waifu.im artwork (`assets/gacha-waifu.jpg`) serves every card,
  so the simulator makes no runtime image requests and never risks rate limits
- Click any card to open the artwork's source page
- Batch summary plus a session tally with an observed SSR rate (labeled
  experimental); Clear resets the session
- Invalid input disables the 10 Pulls button — nothing is silently clamped

## Development

```bash
# nothing to install — open index.html, or:
python3 -m http.server 8000
```

## Tests

Node-only harnesses eval the pure-math sections and assert behaviour:

```bash
node test/math.test.js    # coin-flip math: basis points, mirroring, distribution
node test/gacha.test.js   # gacha odds: parsing, boundaries, ten-pull, distribution
```

## Structure

- `index.html` / `script.js` — coin flip
- `gacha.html` / `gacha.js` — gacha simulator
- `styles.css` — shared design tokens, nav, and page styles
- `assets/gacha-waifu.jpg` — bundled gacha artwork
- `test/` — node test harnesses
- `.github/workflows/deploy.yml` — auto-deploys to GitHub Pages on push to `main`

## Conventions

See `AGENTS.md` → `context/zw-js-coding-preference.md`.

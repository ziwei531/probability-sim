# Probability Sim ☘️

Two probability simulators in one tiny static site — a coin flip and a gacha
pull — built with vanilla HTML, CSS, and JavaScript. No frameworks, no build
step, no runtime API calls.

**Live:** https://ziwei531.github.io/probability-sim/

## Tools

### Coin Flip

- A lightweight inline-SVG recreation of Malaysia's third-series 50 sen coin:
  Bunga Raya denomination face, Sulur Kacang motif face, security lines, and
  the distinctive nine-indent edge—no runtime image asset
- Click the coin (or focus it and press Enter/Space) to toss it
- Configure the heads/tails percentages — the other side mirrors so the pair
  always sums to exactly 100%
- Float-safe math: percentages live as integer basis points, so the display
  never drifts
- Values with excessive decimal precision normalize to two decimal places on
  commit, keeping the visible pair honest
- Empty or invalid odds block both flip controls instead of silently reusing a
  stale probability
- Heads/tails counter resets only when a percentage actually changes
- Every probability and flip control locks while a toss is in flight, so rapid
  clicks or mid-air edits cannot corrupt the result state

### Gacha Simulator

- Set an SSR probability (0–100%, decimals welcome) and pull 10 cards
- Each pull rolls independently: SSR at your configured rate, SR takes 20% of
  the remainder, R takes the rest
- Live probability chips show the full SSR/SR/R breakdown plus the exact chance
  of getting at least one SSR in a ten-pull
- Rarity is assigned before artwork — the image never determines rarity
- One bundled artwork (`assets/gacha-waifu.jpg`) serves every card,
  so the simulator makes no runtime image requests and never risks rate limits
- Click any card to open the artwork's source page
- Batch summary plus a session tally with an observed SSR rate (labeled
  experimental); Clear or changing the configured rate resets the session so
  observations from different probabilities are never mixed
- Invalid input disables the 10 Pulls button — nothing is silently clamped

## Development

```bash
# nothing to install — open index.html, or:
python3 -m http.server 8000
```

## Tests

Node-only harnesses eval the pure-math sections and assert behaviour:

```bash
node test/math.test.js        # coin-flip math: basis points, mirroring, distribution
node test/coin-dom.test.js    # invalid input and in-flight control regression
node test/gacha.test.js       # gacha odds: parsing, boundaries, ten-pull, distribution
node test/gacha-dom.test.js   # session reset and DOM-state regression
```

## Structure

- `index.html` / `js/script.js` — coin flip
- `views/gacha.html` / `js/gacha.js` — gacha simulator source
- `styles/styles.css` — shared design tokens, nav, and page styles
- `assets/gacha-waifu.jpg` — bundled gacha artwork
- `test/` — node test harnesses
- `.github/workflows/deploy.yml` — assembles and deploys the public Pages artifact on push to `main`

## Conventions

See `AGENTS.md` → `context/zw-js-coding-preference.md`.

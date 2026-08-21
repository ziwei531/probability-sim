# Probability Sim ☘️

Two probability simulators in one tiny static site — a coin flip and a gacha
pull — built with vanilla HTML, CSS, and JavaScript. No frameworks, no build
step, no runtime API calls.

**Live:** https://ziwei531.github.io/probability-sim/

## Tools

### Coin Flip

- Official [Bank Negara Malaysia 50 sen artwork](https://www.bnm.gov.my/-/currency/coins/50sen), split locally into obverse and reverse faces from the BNM reference image
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
- Choose Normal Recruit or UR Pickup; both label the Pilgrim-equivalent slice as UR
- Normal Recruit defaults to 4% SSR / 0.5% UR; UR Pickup defaults to 4% SSR / 1% UR
- UR is a tagged slice inside SSR, so its configurable rate can never exceed SSR
- Each pull rolls independently: UR first, then other SSR, SR, and R
- Live probability chips show the full SSR/UR/SR/R breakdown plus the exact chance
  of getting at least one SSR or UR in a ten-pull
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
# serve locally (required for fetched views)
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

- `index.html` / `views/coin-flip.html` / `js/script.js` — coin flip
- `views/gacha.html` / `js/gacha.js` — gacha simulator source
- `js/view-loader.js` — mounts the selected HTML view and refreshes runtime assets
- `scripts/prepare-pages.py` — fingerprints the GitHub Pages deployment artifact
- `styles/styles.css` — shared design tokens, nav, and page styles
- `assets/gacha-waifu.jpg` — bundled gacha artwork
- `test/` — node test harnesses
- `.github/workflows/deploy.yml` — assembles and deploys the public Pages artifact on push to `main`

## Nikke-inspired model

The presets are an explicitly simplified model, not a claim that the site reproduces every NIKKE pool rule:

- Both presets use 4% total SSR, matching the cited general recruitment rate.
- Normal Recruit uses 0.5% UR as the Pilgrim/Over-spec tagged slice.
- UR Pickup uses 1% UR as the featured Pilgrim-equivalent slice.
- UR remains inside the 4% SSR band rather than increasing total SSR probability.

Sources: [Gyattcha recruitment FAQ](https://www.gyattcha.com/en/banners/),
[Nikke.gg December 2024 patch notes](https://nikke.gg/december-26-patch-notes/),
and [Nikke.gg third-anniversary patch notes](https://nikke.gg/october-30-update-patch-notes/).

## Deployment caching

GitHub Pages does not provide a reliable per-deployment cache purge or custom response-header control. The deployment workflow therefore fingerprints text-asset URLs with the commit SHA, while the runtime loaders add a fresh reload token when fetching views, styles, scripts, and local images.

This minimizes stale deployments, but a browser may still display an already-cached old HTML shell until its CDN/browser cache expires; a hard refresh or a new query string remains the only absolute manual override.

## Conventions

See `AGENTS.md` → `context/zw-js-coding-preference.md`.

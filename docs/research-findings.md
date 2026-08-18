# Coin-Flip Game — Research Findings

Research for a vanilla HTML+JS coin-flip game (static, no frameworks/deps, GitHub Pages). All sources fetched live on 2026-08-18 via hound (keyless web search/fetch); quotes are verbatim from fetched pages. Empirical checks ran under `node` on this host.

---

## 1. Weighted Random in JavaScript

**1.1 — Use integer basis points + `Math.floor`, not a float threshold.**
Recommendation (exact algorithm, pure function for `script.js`):

```js
function flipHeadsBp( headsBp ) {
	const roll = Math.floor( Math.random() * 10000 ); // uniform 0..9999
	return roll < headsBp;                            // headsBp=10000 => always heads; 0 => never
}
// usage: flipHeadsBp( 3725 ) for 37.25% heads
```

The percentage (max 2 decimals) is stored as an integer 0–10000 basis points (`37.25%` = 3725). One integer bucket per basis point makes the boundary exact by construction: at `headsBp = 10000` every roll is `< 10000` (always heads), at `0` none is (never heads). Verified with node: 100k iterations at both boundaries → PASS; 400k flips at 3725 bp → 37.25% observed. The float-threshold variant `Math.random() < 0.3725` is statistically equivalent but leans on a float comparison at the 0/1 edges and forces epsilon-style reasoning for no benefit. Cumulative-sum (weighted-pool) approaches are the general multi-outcome solution — overkill for two outcomes.

- Confidence: **high** (algorithm verified by execution; pattern is the canonical SO answer)
- Sources opened:
  - https://stackoverflow.com/questions/8435183/generate-a-weighted-random-number (page fetch 403'd; algorithm quote verified via search snippet)
  - https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Math/random
- Quotes:
  - SO: "Another strategy is to pick a random number in [0,1) and iterate over the weight specification summing the weights, if the random number is less than the sum then return the associated value."
  - MDN: "returns a floating-point, pseudo-random number that's greater than or equal to 0 and less than 1, with approximately uniform distribution"

**1.2 — Never `===` floats; `Number.EPSILON` is a magnitude-1 tolerance, not a universal one.**
`0.1 + 0.2 === 0.3` is `false` (verified). MDN: "it is often advised that **floating point numbers should never be compared with `===`**" and "do not simply use `Number.EPSILON` as a threshold for equality testing. Use a threshold that is appropriate for the magnitude and accuracy of the numbers you are comparing." For this app the practical rule: keep percentages as integers (bp) end-to-end; floats appear only for display formatting, where `toFixed(2)` is the final word. If a float equality is ever needed (e.g. in tests), compare `Math.abs(a - b) < 1e-9` — bp integers avoid this entirely.

- Confidence: **high**
- Source: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Number/EPSILON

**1.3 — `Math.random()` precision is a non-issue here.**
52-bit mantissa granularity (≈ 2.2e-16) is ~11 orders of magnitude finer than a basis point (1e-4), so bucket bias is negligible; MDN's note that claimed ranges "aren't exact" applies to scaling near the top of the range — irrelevant with the integer approach. It is *not* cryptographically secure, which is fine for a game (MDN: "do not use them for anything related to security").

- Confidence: **high** | Source: MDN Math/random (above)

---

## 2. Percentage Input Mirroring

**2.1 — Store as integer basis points; mirror with subtraction; format with `toFixed(2)`.**
This is the single source of truth that makes the pair sum to *exactly* 100 in all cases:

```js
const toBp   = ( v ) => Math.round( Number( v ) * 100 ); // "37.25" -> 3725 (kills 37.2500000001 drift)
const fromBp = ( bp ) => ( bp / 100 ).toFixed( 2 );      // 5050 -> "50.50"
const mirror = ( headsBp ) => 10000 - headsBp;           // integer subtraction: exact by definition
```

Verified round-trips in node: `37.25→3725`, `50.5→5050`, `99.99→9999`, `33.33→3333`, `100→10000`, `0→0`; mirrored display values `62.75 / 49.50 / 0.01 / 66.67 / 0.00 / 100.00`; `headsBp + mirror(headsBp) === 10000` is `true` for every case — no 99.999999 artifacts. `Math.round(x * 100)` absorbs float noise (e.g. `0.29 * 100 === 28.999999999999996` still rounds to 29).

- Confidence: **high** (executed)
- Source: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Number/EPSILON (context for why floats fail)

**2.2 — Input element: `type="number" min="0" max="100" step="0.01"`; read with `valueAsNumber`; clamp in JS.**
MDN: "If you want to enter values with fractions, you'll need to reflect this in the `step` value (e.g., `step=\"0.01\"` to allow decimals to two decimal places)." and "You can still manually enter a number outside these bounds, but it will be considered invalid" — so `min`/`max`/`step` are constraints, not clamps: after parsing, clamp `bp = Math.min( 10000, Math.max( 0, toBp( raw ) ) )`. Empty input → keep last valid value (don't write NaN); `NaN` check via `Number.isNaN`. At 100/0: heads=100 shows tails=0.00 — allowed, flip is deterministic; mirror still holds. `step="0.01"` makes the spinbutton move by 0.01 (or use `step="any"` + manual clamp; 2-decimals max recommended for a cleaner UI).

- Confidence: **high**
- Source: https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Elements/input/number (technical summary: events `change` and `input`; IDL `valueAsNumber`)

**2.3 — Event pattern: `input` event + re-entrancy guard (no loops).**
Listen to `input` on both fields (fires per keystroke, per MDN technical summary). In the handler: parse the edited field → recompute bp → set the *other* field's `value` programmatically → **skip re-mirroring when the other field's `input` fires for a programmatic set**. Implement with a simple boolean flag (`isMirroring`) around programmatic sets, or compare `other.value` against the value you just wrote and bail if equal. Don't use `change` (fires on blur only — feels laggy).

- Confidence: **high** (standard pattern; events per MDN input/number)

---

## 3. Minimalist UI Patterns (+ mobile responsive — required)

**3.1 — Design tokens (quiet/elegant).**
Light: `--bg #fafaf9`, `--fg #1c1917`, `--muted #78716c`, `--accent #0f766e`, `--border #e7e5e4`. Dark (via `prefers-color-scheme`): `--bg #171717`, `--fg #f5f5f4`, `--muted #a8a29e`, `--accent #5eead4`, `--border #262626`. Typography: system stack `-apple-system, "Segoe UI", Roboto, "Helvetica Neue", sans-serif`; one weight (400) for body, 600 for numbers; max line length ~34rem. Spacing: 4px base scale (4/8/12/16/24/32/48). Button: flat, 1px border, transparent bg, `border-radius: 999px`, generous padding (14px 32px), `transition: background 120ms ease, transform 120ms ease`, hover = subtle bg tint, `:active` = scale(0.98). Inputs: border-bottom only or hairline box, `font-variant-numeric: tabular-nums`, centered text. No shadows, no gradients, no rounded-corners everywhere — restraint is the aesthetic.

- Confidence: **high** (design recommendation; no external claim)

**3.2 — 3D coin flip (verified CSS pattern).**
MDN: "You have to start by configuring the 3D space by giving it a perspective, then you have to configure how your 2D elements will behave in that space." Pattern (from MDN cube + dev.to coin article): parent `.scene { perspective: 900px }`; `.coin { transform-style: preserve-3d; transition: transform 0.7s cubic-bezier(0.4, 0, 0.2, 1) }`; two absolutely-positioned circular faces with `backface-visibility: hidden`, tails face pre-rotated `transform: rotateY(180deg)`; flip by toggling `.coin.is-flipped { transform: rotateY(180deg) }` (or 180° + N full turns for a "tossed" feel: `rotateY(1620deg)`). Works with a plain `transition` — no keyframes needed for a single flip.

- Confidence: **high** (MDN fetched; dev.to snippet) | Sources:
  - https://developer.mozilla.org/en-US/docs/Web/CSS/Guides/Transforms/Using
  - https://dev.to/shahibur_rahman_6670cd024/build-a-3d-flipping-coin-with-html-css-javascript-deep-dive-26h2 (snippet: `.coin { transform-style: preserve-3d; transition: transform var(--flip-duration) ease-in-out; } .coin.is-flipped { transform: rotateY(180deg) !important; }`)

**3.3 — Mobile responsiveness (REQUIRED).**
- `<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">` (MDN: "The most common setting is … `width=device-width, initial-scale=1`"; `viewport-fit=cover` + safe-areas for notched phones).
- Fluid sizing with `clamp()`: coin `width: clamp(160px, 40vw, 240px)`; title `font-size: clamp(1.5rem, 5vw, 2.25rem)`.
- Layout: one centered column (`min-height: 100dvh; display: grid; place-items: center`); the two percentage inputs in a flex row that collapses to a column under `600px` (`flex-wrap: wrap` or one `@media (max-width: 600px)` block).
- Touch targets ≥ 44px (button `min-height: 48px; padding` 14px; inputs `min-height: 44px`).
- iOS zoom prevention: all inputs/selects `font-size: 16px` minimum — Safari auto-zooms focused inputs with `font-size < 16px`. (Source page https://web.dev/articles/inputs-that-dont-zoom now 404s — behavior is widely documented; see Gaps.)
- Safe areas: `padding: env(safe-area-inset-top) env(safe-area-inset-right) env(safe-area-inset-bottom) env(safe-area-inset-left)` on the app shell. MDN: "It's highly recommended to use the safe area inset variables to ensure that important content doesn't end up outside the display."
- Breakpoints: 600px (stack inputs, shrink coin) and 900px (widen spacing) — the app is single-screen so two breakpoints suffice.

- Confidence: **high** (viewport meta, safe-area verified) / **medium** (16px zoom rule — source moved)

---

## 4. GitHub Pages + Actions Deploy

**4.1 — Exact workflow (`.github/workflows/deploy.yml`), versions per docs.github.com (fetched 2026-08-18):**

```yaml
# Simple workflow for deploying static content to GitHub Pages
name: Deploy static content to Pages

on:
  push:
    branches: ["main"]
  workflow_dispatch:

permissions:
  contents: read
  pages: write
  id-token: write

concurrency:
  group: "pages"
  cancel-in-progress: false

jobs:
  deploy:
    environment:
      name: github-pages
      url: ${{ steps.deployment.outputs.page_url }}
    runs-on: ubuntu-latest
    steps:
      - name: Checkout
        uses: actions/checkout@v6
      - name: Setup Pages
        uses: actions/configure-pages@v5
      - name: Upload artifact
        uses: actions/upload-pages-artifact@v4
        with:
          path: "."
      - name: Deploy to GitHub Pages
        id: deployment
        uses: actions/deploy-pages@v4
```

Notes: single job suffices (no build step — static files at repo root, `path: "."` uploads everything; `upload-pages-artifact` handles `.nojekyll`). Docs quote: "The job must have a minimum of `pages: write` and `id-token: write` permissions." The official starter (`actions/starter-workflows/pages/static.yml`, fetched raw) is identical in shape but pins older majors (checkout@v4, upload-pages-artifact@v3, deploy-pages@v5); docs.github.com's current examples use checkout@v6 / upload-pages-artifact@v4 / deploy-pages@v4 — pin any of these majors; all work. deploy-pages README (fetched): "The id-token permission is necessary to request the OIDC JWT token."

- Confidence: **high**
- Sources:
  - https://docs.github.com/en/pages/getting-started-with-github-pages/using-custom-workflows-with-github-pages
  - https://raw.githubusercontent.com/actions/starter-workflows/main/pages/static.yml
  - https://raw.githubusercontent.com/actions/deploy-pages/main/README.md

**4.2 — First-time setup: enable Pages + set source to "GitHub Actions" via API/gh.**
Docs: "To start using custom workflows you must first enable them for your current repository." `configure-pages` itself "enable[s] Pages" (README: "A GitHub Action to enable Pages and extract various metadata about a site"), but the *source* must be switched to workflow mode — the API way (REST verified: `build_type` is `legacy` or `workflow`; PUT returns 204):

```bash
# If the site already exists (PUT updates):
gh api repos/{owner}/{repo}/pages -X PUT -f build_type=workflow
# If Pages was never enabled (GET 404), create it instead:
gh api repos/{owner}/{repo}/pages -X POST -f build_type=workflow -f source[branch]=main -f source[path]=/
```

Token requirements (REST docs, fetched): classic PATs need `repo` scope; fine-grained need "Pages" **write** + "Administration" **write**; the user must be an admin/maintainer. `gh api -f` sends form-encoded fields, equivalent to the documented `-d '{"build_type":"workflow"}'`. UI equivalent: repo Settings → Pages → Source: **GitHub Actions**.

- Confidence: **high** (REST reference fetched) | Source: https://docs.github.com/en/rest/pages/pages?apiVersion=2022-11-28 — "`workflow` means that the site is built by a custom GitHub Actions workflow. `legacy` means that the site is built by GitHub when changes are pushed to a specific branch."

---

## UNCERTAINTY & GAPS

1. **SO 8435183** (weighted-random) returned 403 on direct fetch; its quote comes from the search-result snippet only. The algorithm itself is independently verified by execution here, so impact is low.
2. **Action major-version drift**: docs.github.com examples (checkout@v6, upload-pages-artifact@v4, deploy-pages@v4) disagree with the live starter-workflows file (checkout@v4, upload-pages-artifact@v3, deploy-pages@v5). Both were fetched live today; pin whichever majors exist at implementation time (all are drop-in).
3. **iOS 16px zoom rule**: source URL (web.dev "inputs that don't zoom") returned 404; behavior is long-standing WebKit behavior and widely documented, but I could not re-verify a live citation. Keep `font-size: 16px` on inputs regardless — it is the standard mitigation.
4. **PUT vs POST for `build_type`**: REST docs list PUT statuses 204/400/409/422 (no 404), and POST returns 409 if a site already exists; exact server behavior when the site has never been enabled was not executed end-to-end (no repo/credentials here). The GET-check-then-POST/PUT sequence above is the safe path; if the workflow's `configure-pages` step fails with a Pages-not-enabled error, run the POST once.
5. **"Configuring a publishing source" docs page** was not fetched; the "GitHub Actions" UI option is asserted from the REST `build_type: workflow` contract plus the custom-workflows page quote — the API path is the verified one.
6. **dev.to 3D-coin article** quoted from search snippet, page not fetched (JS-shell risk); MDN (fetched) independently covers every CSS property used, so the pattern is safe.
7. Design tokens / breakpoints / 44px targets are recommendations (no external citation claimed) — 44px is the widely used minimum touch-target guideline, not a verified quote here.

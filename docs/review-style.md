# Style & Correctness Review — coin-flip (vanilla HTML/CSS/JS)

Reviewed: `index.html`, `styles.css`, `script.js`, `test/math.test.js`, `.github/workflows/deploy.yml`
Contract: `AGENTS.md` + `context/zw-js-coding-preference.md`
Evidence: grep output run verbatim in repo root; node test executed; YAML parsed with pyyaml; action versions checked against GitHub API latest releases.

## Static checks (the 8 greps)

| # | Check | Result | Evidence |
|---|-------|--------|----------|
| 1 | Tabs, not spaces | **PASS** | `grep -rnP '^ +[^ *]' index.html styles.css script.js` → no output (exit 1) |
| 2 | No trailing whitespace | **PASS** | `grep -rnP ' $|\t$' index.html styles.css script.js test/math.test.js .github/workflows/deploy.yml` → no output (exit 1) |
| 3 | No `var` | **PASS** | `grep -n '\bvar\b' script.js` → no output (exit 1) |
| 4 | Leading commas on multi-line literals | **PASS** | `grep -nP '^\t*, ' script.js` → `32:	, isMirroring: false`; first item line 31 uses the two-space prefix (`  headsBp    : 5000`). No trailing-comma-style literals anywhere. |
| 5 | No arrows assigned to identifiers | **PASS in script.js / FAIL in test** | `grep -nP 'const \w+ = \(' script.js` → no output (exit 1); but `test/math.test.js:49 const stubRandom = ( value ) => {` and `:65 const lcgRandom = () => {` assign arrows to identifiers |
| 6 | Template literals, no concatenation | **PASS** | `grep -n '" + ' script.js` → no output; test file uses `${...}` templates |
| 7 | Strict equality, no loose `==` | **PASS** | `grep -nP '[^=!]==[^=]' script.js` → no output (exit 1); test uses `===` / `!==` only |
| 8 | Alignment of `=`/`:` columns | **PASS (eyeball)** | script.js:35-39 `flipButton`/`resultLine`/`coin`/`headsInput`/`tailsInput` aligned by `=`; state object loosely aligned by `:` (31-32); test:2-3, 28-32, 72-74 aligned |

## Findings

| issue_id | severity | category | evidence | fix |
|---|---|---|---|---|
| B1 | high | bug | script.js:84 `coin.classList.toggle( "is-flipped" );` — parity-based 180° toggle (comment :83 "nine half-turns… lands the visible face on the opposite side") vs :85 `resultLine.textContent = flipToss( state.headsBp ) === "heads" ? "Heads!" : "Tails!";` — random outcome. Visible face and announced result agree only ~50% of flips. | Drive rotation from the outcome instead of parity: `const outcome = flipToss( state.headsBp );` then `coin.style.transform = "rotateY(" + ( 1620 + ( outcome === "heads" ? 0 : 180 ) ) + "deg)";` (heads lands 0°/360°, tails 180°), keeping the 0.7s transition and disabled lock. |
| W1 | low | workflow | GitHub API `releases/latest`: actions/checkout **v7.0.1**, configure-pages **v6.0.0**, upload-pages-artifact **v5.0.0**, deploy-pages **v5.0.0** — workflow pins @v6/@v5/@v4/@v4 (functional, one major stale). | Bump pins to current majors; keep major-only pinning. |
| W2 | low | workflow | pyyaml parse: `top keys: ['name', True, 'permissions', 'concurrency', 'jobs']` — `on:` reads as boolean `True` under YAML 1.1 (GH Actions' own parser accepts it, so it runs). | Quote the key: `"on":` — silences strict linters (yamllint) with zero behaviour change. |
| A1 | low | accessibility | index.html:30 `<p class="result" id="result" aria-live="polite"></p>` + script.js:85 — consecutive identical outcomes ("Heads!" twice) leave `textContent` unchanged → screen readers never re-announce. | Clear then set: `resultLine.textContent = "";` before writing the new value (or vary with a trailing space via `requestAnimationFrame`). |
| A2 | low | accessibility | styles.css:122 `input:focus { outline: none; }` — keyboard focus indicator reduced to a 1px border-color change. | Add `outline: 2px solid var( --accent ); outline-offset: 2px;` under `:focus-visible` (or drop `outline: none`). |
| B2 | low | bug | script.js:62 `state.headsBp = clampBp( toBp( raw ) );` clamps the internal bp but the typed field is not written back — typing 150 shows "150" while tails mirrors to "0.00" (internal is 10000/0). Screen pair no longer sums to 100. | After clamping, write back `headsInput.value = fromBp( state.headsBp );` when raw exceeded 0..100. |
| R1 | low | responsive | styles.css:1-19 — dark palette via `prefers-color-scheme` but no `color-scheme` property; native number spinners/scrollbars stay light in dark mode. | Add `color-scheme: light dark;` to `:root`. |
| G1 | low | style | test/math.test.js:2-3 `require( "fs" )` / `require( "path" )` — CommonJS vs the import/export preference. | Acceptable documented exception (no build step, node defaults, AGENTS.md mandates node-testable). Optionally add a `// CommonJS: no package.json "type": "module"` comment. |
| G2 | low | style | test/math.test.js:49 `const stubRandom = ( value ) => {`, :65 `const lcgRandom = () => {` — arrows assigned to identifiers, against preference ("use a proper function declaration"). | Convert to `function stubRandom( value ) { ... }` / `function lcgRandom() { ... }`. |
| C1 | PASS | correctness | `node test/math.test.js` → `ALL TESTS PASSED` (exit 0). | — |
| C2 | PASS | accessibility | HTML semantics: `lang="en"`, viewport meta with `viewport-fit=cover`, single `<main>` landmark, inputs wrapped in `<label>` (implicit association), decorative faces `aria-hidden="true"`, `aria-live="polite"` result, native `<button>`. | — |
| C3 | PASS | responsive | 44px input min-height (styles.css:108), 48px button (127), `font-size: 16px` input anti-zoom (116), `clamp()` on h1/scene/coin-face, 600px stacking breakpoint (159), `env( safe-area-inset-* )` body padding (34). | — |
| C4 | PASS | bug | 3D coin CSS correct: `perspective: 900px` on `.scene` (56), `transform-style: preserve-3d` + `transition: transform 0.7s` on `.coin` (63-64), `backface-visibility: hidden` (83), tails pre-rotated `rotateY( 180deg )` (88), `1620deg` = 4.5 turns (69). | — |
| C5 | PASS | workflow | YAML valid; `permissions: contents: read / pages: write / id-token: write` (least-privilege, correct for Pages); `concurrency` group; step order checkout → configure-pages → upload-artifact → deploy-pages with `page_url` env wiring (deploy.yml:9-35). | — |

## Overall verdict: **APPROVE-WITH-FIXES**

Style contract is met in every file that ships to the browser (checks 1-4, 6-8 clean; the only style violations are in the node test harness, G1/G2). Tests pass; the workflow is valid and correctly permissioned. One high-severity user-visible bug (B1 — the animated coin face disagrees with the announced outcome roughly half the time) plus several low-severity polish items should be fixed before this is considered done.

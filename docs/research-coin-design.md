# Research: Realistic CSS coin + top-to-bottom toss

Goal: a gold coin that reads as real metal at 160–240px, flipping end-over-end (`rotateX`) like a tossed coin. Current repo uses a flat `rotateY` transition (see `styles.css`); findings below are the verified building blocks plus one recommended composition. All URLs were fetched live via hound; `[unverified]` marks claims I could not confirm against a fetched source.

## Part 1 — Metallic coin look

**1. Dome shading = stacked radial-gradients.** Two `radial-gradient`s (light top-left highlight, dark bottom-right falloff) fake the convex dome. Source: CodePen "CSS Gold Gradient".
```css
background: radial-gradient(ellipse farthest-corner at right bottom, #FEDB37 0%, #FDB931 8%, #9f7928 30%, #8A6E2F 40%, transparent 80%),
            radial-gradient(ellipse farthest-corner at left top, #FFFFFF 0%, #FFFFAC 8%, #D1B464 25%, #5d4a1f 62.5%, #5d4a1f 100%);
```
Verbatim (pen CSS): `radial-gradient(ellipse farthest-corner at left top, #FFFFFF 0%, #FFFFAC 8%, #D1B464 25%, #5d4a1f 62.5%, #5d4a1f 100%)`. Confidence: **High** (fetched verbatim).

**2. Rim = beveled ring via ::before/::after + inset shadow.** The "Pure CSS Coins" pen builds each coin from three concentric circles: base, `:before` ring (slightly smaller, 1px metal border), `:after` inner disc with directional "bevel" borders + inset shadow — this is the double-ring technique.
```css
.coin:before{ content:""; width:50px; height:50px; position:absolute; border-radius:50px; }
.coin:after{ content:""; width:42px; height:42px; display:block; top:4px; left:4px; position:absolute; border-radius:50px;
  border-top: 1px solid rgba(255,255,255,0.3);
  border-left: 1px solid rgba(255,255,255,0.3);
  border-bottom: 1px solid rgba(209,156,53,0.3);
  border-right: 1px solid rgba(209,156,53,0.5);
  box-shadow: inset 0px 0px 2px 2px rgba(153, 106, 26, .05); }
```
Verbatim (pen CSS): `border-top: 1px solid rgba(255,255,255,0.3); border-left: 1px solid rgba(255,255,255,0.3);` — light on top/left, dark on bottom/right = lit-from-above bevel. Confidence: **High** (fetched verbatim). For a single-face approach, the same bevel reads through two `box-shadow` inset rings: `inset 0 0 0 6px rgba(60,40,0,.25), inset 0 0 0 7px rgba(255,235,160,.35)`.

**3. Metallic sheen = conic-gradient sweep.** The freefrontend roundup credits conic-gradient for the gloss on 3D coins: "Vibrant, high-fidelity gold shine sweeps and glossy edge highlights utilize conic-gradient() overlays running directly on GPU layers." Confidence: **Medium** (roundup description; no pen code fetched).

**4. Engraved text = light-shadow/below + dark-shadow/above.** 30-seconds-of-code: "For the engraved text, the text-shadow should be lighter than the background, while for the embossed text, it should be darker." Workable combo for gold (also see CodePen "Engrave, Emboss text"): `text-shadow: 0 1px 0 rgba(255,245,200,.6), 0 -1px 0 rgba(60,40,0,.55);` with a darker gold `color`. Confidence: **Medium** (principle verified verbatim; exact offsets tuned for gold are mine).

**5. Edge thickness = translateZ-stacked rings (verified) or rotateX(90°) band ([unverified] but standard).** dev.to deep-dive stacks 16–36 ring divs at tiny `translateZ` offsets: "Each .coin-edge is the same size as the coin but moved slightly on Z. Stacking many creates the visual ridged edge." For a minimalist coin, skip real thickness; the inset rings of #2 read as a milled edge at 160–240px. Confidence: **High** (technique verified; recommendation mine).

**RECOMMENDED FACE (composition of #1–4; not verbatim from any single source):**
```css
.coin-face {
  position: absolute; inset: 0; border-radius: 50%;
  display: grid; place-items: center;
  background:
    radial-gradient(ellipse farthest-corner at 35% 30%, #fff7c0 0%, #ffe680 12%, #d4af37 38%, #8a6e2f 78%, #5d4a1f 100%),
    radial-gradient(ellipse farthest-corner at 65% 70%, #b8860b 0%, #d4af37 45%, #f0d060 100%);
  box-shadow:
    inset 0 0 0 6px rgba(60, 40, 0, .25), inset 0 0 0 7px rgba(255, 235, 160, .35),
    inset 2px 3px 8px rgba(0, 0, 0, .35), 0 6px 14px rgba(0, 0, 0, .25);
  color: #7a5c12;
  text-shadow: 0 1px 0 rgba(255, 245, 200, .6), 0 -1px 0 rgba(60, 40, 0, .55);
}
.coin-face::after { /* sheen sweep */
  content: ""; position: absolute; inset: 0; border-radius: 50%; pointer-events: none;
  background: conic-gradient(from 210deg, transparent 0deg, rgba(255,255,255,.28) 40deg, transparent 90deg,
    transparent 180deg, rgba(255,255,255,.12) 220deg, transparent 270deg);
}
```
Confidence: **Medium** (all parts verified; composition not render-tested here).

## Part 2 — Top-to-bottom toss (rotateX)

**6. Spin pattern: chain N half-turns in one keyframe.** CodePen "Coin Toss" spins via `rotateX` with scale to fake height:
```css
@keyframes flip { 0% { transform: scale3d(1,1,1) rotateX(0deg); }
  50% { transform: scale3d(2,2,2) rotateX(3600deg); }
  100% { transform: scale3d(1,1,1) rotateX(7200deg); } }
```
Verbatim (pen snippet): `50% { transform: scale3d(2,2,2) rotateX(3600deg); } 100% { transform: scale3d(1,1,1) rotateX(7200deg); }`. Note 3600° = 10 turns = 20 half-turns → same face. Confidence: **High**.

**7. Face parity is arithmetic.** Each 180° `rotateX` swaps faces; total rotation R → `R mod 360 == 0` lands on the starting face, `== 180` lands on the other. So pick `to = from + 180·n`, n odd → tails. The dev.to coin-toss game sets the back face `transform: rotateX(180deg)` and toggles the parent — parity handled by JS choosing the class. Confidence: **High** (geometry; matches pen setup).

**8. Gravity arc: rise fast / hang / fall fast via per-keyframe easing.** MDN: "Easing functions may be specified on individual keyframes in a @keyframes rule." So `ease-out` on the rise (fast launch, slows at apex) and `ease-in` on the fall (accelerates down) gives a parabolic feel; one `cubic-bezier(0.33, 0, 0.2, 1)` over the whole toss is the simpler acceptable default. Confidence: **High** (MDN verified; tuning mine).

**9. Recommended toss (rotateX + translateY arc, restartable):**
```css
.scene { perspective: 900px; }              /* depth lives on the parent */
.coin { transform-style: preserve-3d; }
.coin.flipping { animation: toss 1.1s cubic-bezier(0.33, 0, 0.2, 1) forwards; }
.coin-face { backface-visibility: hidden; }
.coin-tails { transform: rotateX(180deg); }
@keyframes toss {
  0%   { transform: rotateX(var(--flip-from, 0deg))   translateY(0); }
  30%  { transform: rotateX(calc(var(--flip-from, 0deg) + 1620deg)) translateY(-120px); }
  60%  { transform: rotateX(calc(var(--flip-from, 0deg) + 2700deg)) translateY(-150px); }
  100% { transform: rotateX(var(--flip-to, 1800deg))  translateY(0); }
}
```
`forwards` freezes the final face. JS: set `--flip-from`/`--flip-to`, then restart (see #10). Confidence: **Medium** (pattern verified across sources; composed here).

**10. Restarting from a changing angle.** CSS has no "replay" API; the canonical restart is remove-animation → force reflow → re-add. CSS-Tricks (verbatim): "Trigger a reflow in between removing and adding the class name … `void element.offsetWidth;`". So: set the custom props, `classList.remove('flipping')`, `void coin.offsetWidth`, `classList.add('flipping')` — the reflow makes the browser rebuild keyframes with the new `var()` values. Alternatives: two identical `@keyframes` with different names toggled back and forth (CSS-Tricks); or the Web Animations API `coin.animate(keyframes, opts)` for full JS control (MDN-adjacent, [unverified] fetch). `@property`-registered custom properties *are* animatable (CSS-Tricks "Exploring @property": "The animation will update the angle and hue with…"), but unregistered vars inside keyframes do **not** interpolate — the reflow trick is the reliable path. Confidence: **High** (CSS-Tricks verbatim) for reflow; **Medium** for var-in-keyframes behavior.

**11. 3D requirements for rotateX.** Three pieces, all verified on MDN: `perspective` on the parent ("The first element to set is the perspective. The perspective is what gives us the 3D impression."); `transform-style: preserve-3d` on the coin ("sets whether children of an element are positioned in the 3D space or are flattened in the plane of the element"); `backface-visibility: hidden` on faces ("the back face can become visible when a transformation causes the element to be rotated in 3D space"). Gotcha (MDN): any `overflow`≠visible, `opacity`<1, `filter`, or `clip-path` on the coin forces `transform-style: flat` — don't put the sheen `filter`/`overflow` on the `.coin` itself. dev.to agrees: "Without correct perspective, transform-style, and backface-visibility, you won't get a convincing coin." Confidence: **High**.

## UNCERTAINTY & GAPS

- **No live render test**: this Termux env has no browser; the two recommended CSS blocks are compositions of verified snippets, not executed. Tune gradient stops/sheen angles visually.
- `rezabaharvand.dev/blog/coin-flip-javascript` redirects to the homepage — its `rotateX` snippet is **unverified**.
- freefrontend's pen links are JS-injected and were not extractable; per-pen code there is **unverified** (only descriptions quoted).
- `--flip-from`/`--flip-to` in keyframes rely on reflow-triggered re-resolution; behavior is implementation-defined and should be smoke-tested per browser (esp. Safari).
- Edge-thickness via `rotateX(90deg)` band element is a standard technique but I fetched no pen demonstrating it — use the translateZ-stack (verified, dev.to) or skip thickness.
- No testing of `prefers-reduced-motion` handling — recommended for a real deployment.

# Sol Adversarial Review — Probability Sim

**Scope:** `script.js`, `gacha.js`, DOM state transitions, and the probability claims added to the interface.

**Stance:** Refuted or uncertain until independently recomputed from the real source sections. The scratch harness extracted the production functions between the pure-math markers, ran exhaustive sweeps, printed the evidence below, and was deleted after execution.

## Verdicts

| issue_id | verdict | severity | reason | evidence |
|---|---|---|---|---|
| PS-01 | VERIFIED | core | Coin mirroring and percentage round-trips remain exact across the complete basis-point domain. | Swept all 10,001 integer basis points; `toBp(fromBp(bp)) === bp` and `bp + mirror(bp) === 10000`; failures: 0. |
| PS-02 | VERIFIED | core | Gacha rarity probabilities stay non-negative and sum to 100% for every SSR setting representable to two decimals. | Swept SSR 0.00% through 100.00% in 0.01-point increments; 10,001 settings; maximum floating-point sum error: `1.4210854715202004e-14`; failures: 0. |
| PS-03 | VERIFIED | core | The displayed chance of at least one SSR in ten pulls uses the correct binomial complement, `1 - (1 - p)^10`. | Compared production exponentiation against independent repeated multiplication at all 10,001 SSR settings; maximum difference: `2.842170943040401e-14`; failures: 0. At 3%, the result is `26.257587310507174%`. |
| PS-04 | FIXED | medium | The previous session rate silently mixed pulls made under different configured SSR rates, making the observed percentage statistically meaningless. | New DOM regression test seeds 20 pulls / 2 SSR, changes 3% to 5%, and proves pulls, SSR count, cards, summary, and status all reset. |
| PS-05 | FIXED | low | Coin inputs accepted more than two typed decimal places while the mirrored field used basis-point precision, so the visible pair could appear not to sum to 100%. | `normalizePercentDisplay("33.333") === "33.33"`; overflow also normalizes: `150 → 100.00`, `-20 → 0.00`; empty input remains uncommitted. |
| PS-06 | FIXED | low | The shadow preceded the animated coin, so the existing general-sibling selector could never animate it during a toss. | The shadow now follows `.coin-mover`, satisfying `.coin-mover.flipping ~ .coin-shadow`. |
| PS-07 | VERIFIED | accessibility | Reduced-motion users no longer receive a one-second toss animation or an unexplained one-second disabled wait. | CSS collapses animation and transition duration under `prefers-reduced-motion`; JavaScript checks the same media query and uses a zero-millisecond completion timer. |
| PS-08 | FIXED | high | Clearing a coin input left the last valid probability active but invisible, allowing a toss under hidden stale odds. | New DOM regression clears Heads, then proves both flip controls are disabled and a visible alert appears; entering a valid value restores them. Both inputs expose `required`, `aria-describedby`, and live `aria-invalid`. |
| PS-09 | FIXED | medium | Coin probabilities could be edited during the one-second toss after its outcome and count had already been computed, producing a displayed result with reset or mismatched statistics. | New DOM regression proves the coin, flip button, Heads, and Tails all lock in flight and all restore only after toss completion. |

## Test evidence

- `node --test`: four test files passed, zero failures.
- `html-validate index.html views/coin-flip.html views/gacha.html`: zero errors after semantic corrections.
- `csstree-validator styles.css`: zero errors.
- Duplicate HTML identifiers: zero.
- JavaScript selectors missing from their corresponding HTML page: zero.

## Overall verdict: **GO**

The existing core math remains correct. The important adversarial finding was not the random generator—it was state semantics: an observed rate must never combine experiments with different configured probabilities. That defect is fixed and regression-tested.

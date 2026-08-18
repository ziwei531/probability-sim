# Adversarial Math Review — coin-flip

**Reviewer stance:** REFUTED/UNCERTAIN until independently confirmed. Every claim below was recomputed
from first principles in `docs/verify-math-scratch.js` (independent node harness; deleted after the run —
see `git status`/repo state; only this review remains). Repo test file `test/math.test.js` also executed:
`ALL TESTS PASSED` (exit 0). That only proves self-consistency; the independent harness is the evidence.

## Verdict schema

| issue_id | verdict | severity | reason | evidence |
|---|---|---|---|---|
| CF-01 | VERIFIED | — (core) | Weighted-flip core is correct. `roll = floor(random*10000)` is uniform 0..9999; `roll < headsBp` gives heads probability exactly `headsBp/10000`; strict `<` makes 5000bp a perfect coin and 10000bp always-heads, 0bp never-heads. | Boundary stub matrix, 15/15 correct: `random=0.9999999,10000bp→true`; `random=0,0bp→false`; `random=0.5,5000bp→false` (roll=5000, `5000<5000` false); `random=0.4999999,5000bp→true`; `random=0.9998999,9999bp→true`; `random=0.9999,9999bp→false` (exact boundary: heads iff `random < 0.9999`). |
| CF-02 | VERIFIED | — (core) | `mirror` is exact integer subtraction: `bp + mirror(bp) === 10000` for **every** integer bp. | Sweep 0..10000: failures=0 (10001/10001). |
| CF-03 | VERIFIED | — (core) | `toBp` absorbs float drift (`0.29*100 === 28.999999999999996`); every 2-decimal display string 0.00..100.00 maps to exact cents; `fromBp` renders exactly 2 decimals for all bp and `toBp(fromBp(bp)) === bp` round-trips for all 10001 bp. | `toBp('0.29')=29`, `'33.33'=3333`, `'66.67'=6667`, `'99.99'=9999`, `'0.01'=1`, `'37.25'=3725`, `'50.5'=5050`; full 10001-string sweep bad=0; `fromBp` sweep badDecimals=0, badRoundTrip=0; half-up confirmed `toBp('37.255')=3726`. |
| CF-04 | VERIFIED | — (core) | Display pair always sums to 100.00. Stronger than claimed: even strict float equality `Number(fromBp(bp)) + Number(fromBp(10000-bp)) === 100` held for **all 10001 pairs** (float errors are < half-ulp at 100); `(s1+s2).toFixed(2)==="100.00"` and cents sum `=== 10000` everywhere. | strictSumFail=0, toFixedSumFail=0, centsSumFail=0 (sweep 0..10000). |
| CF-05 | VERIFIED | — (core) | Real `flipHeadsBp` (marker-eval'd from script.js) under deterministic MINSTD LCG, 1,000,000 trials: 3725bp → 0.372625 (target 0.3725, Δ=0.000125 ≈ 0.26σ); 9999bp → 999897 heads = 0.999897 (matches LCG granularity prediction ≈ 0.999897, never 100%); 1bp → 116 heads (expected ≈100, σ≈10, 1.6σ; "never heads in 1M" is a wrong expectation — ~100 heads is correct). | `frac=0.372625`, `frac=0.999897 (heads=999897)`, `heads=116`. |
| CF-06 | REFUTED (comment claim) | low | script.js:46 comment "Programmatic .value writes can echo back as input events" is factually wrong — per HTML spec, assigning `input.value` does not dispatch `input` events. The `isMirroring` guard is harmless and the behavior is safe regardless. | Full script.js eval'd under a DOM shim with **worst-case echo** (every `.value` write re-dispatches the handler synchronously): no infinite loop — total handler calls bounded at 19 across 7 edits; echo and no-echo runs converge to identical state. |
| CF-07 | UNSUPPORTED | low | Test file claims to cover the pure-math section but leaves the hardest cases untested: never stubs `Math.random` at 0 / 0.9999999, never tests 9999bp / 1bp boundaries, no `toBp(0.29)`/`33.33`/`66.67` float-drift cases (the exact case the code comment claims), no mirror sweep 0..10000, no display-pair-sum check; `flipToss` and the `window.coinFlip` export are never asserted. All of these independently verified CORRECT here, so it is a coverage gap, not a correctness failure. | Repo test = 5 toBp + 5 mirror + 5 fromBp spot checks, 3 stub-random rows, one 400k LCG run; my independent harness: 64 checks incl. 10001-sweeps and 3×1M distribution runs, 0 failures. |
| CF-08 | VERIFIED (behavior) / note | low | Mid-edit NaN (empty/partial field) is guarded (`Number.isNaN(valueAsNumber)` early-return) — state stays consistent with the last valid pair; no NaN can reach `state.headsBp`. | Shim: `type(heads,'')` → headsBp stays 3333, tails stays '66.67', no throw. Note: `toBp(NaN)`/`clampBp(NaN)` would propagate NaN if a future caller bypassed the guard (currently unreachable — handlers guard first). |
| CF-09 | VERIFIED | low | Input clamping is required (type=number `min/max` do not block typed out-of-range values) and correct: clamp applied **after** toBp so `150→10000` and `-50→0`; no stale `headsBp` after editing tails (last-edit-wins recomputes from the edited field). | Shim: heads '150' → headsBp=10000, tails '0.00'; heads '-50' → 0, tails '100.00'; tails '66.67' → headsBp=3333, heads '33.33' (echo worst-case too). |

## Distribution statistics (computed)

- 1,000,000 @ 3725bp: heads=372625, frac=0.372625 (σ≈483 → 0.26σ from target)
- 1,000,000 @ 9999bp: heads=999897, frac=0.999897 (expected 999897.1 by LCG granularity — exact match)
- 1,000,000 @ 1bp: heads=116, frac=0.000116 (expected ~100, σ≈10, 1.6σ)
- Repo test's own 400k @ 3725bp reproduced: frac=0.373325 (its ±0.005 tolerance = 2000 heads ≈ 6.5σ — no false-fail risk)
- LCG audit: MINSTD chi-square (99 dof) = 94.69 (p≈0.60, uniform); product 48271·(2^31−2) ≈ 1.04e14 < 2^53 ✓ (exact integer arithmetic claim holds); seed 123456789 first output 0.0538031543

## DOM attack checklist (read + simulated)

- NaN in inputs: impossible via handlers (valueAsNumber guard) — verified by simulation.
- Mirrored value not summing to 100.00: impossible — integer bp invariant (CF-02/CF-04).
- Infinite input-event loop: impossible — `isMirroring` flag is set synchronously around programmatic writes; even under a hostile echo model, handler traffic is bounded and state converges (CF-06).
- Stale headsBp after editing tails: no — tails handler recomputes `headsBp = clampBp(10000 - toBp(raw))` and re-mirrors heads (CF-09).
- UX note (non-bug): while a field is cleared mid-edit the sibling keeps the last valid mirror, so the visible pair can momentarily not read 100.00 (e.g. heads='' tails='62.75'); `state.headsBp` stays consistent with the last valid pair.

## Overall verdict: **GO**

The weighted-random + percentage-mirroring math is correct as implemented. All core claims independently
confirmed with computed evidence; remaining findings are low-severity (comment inaccuracy CF-06, test
coverage gaps CF-07, mid-edit display artifact CF-08 note).

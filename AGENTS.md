# AGENTS.md

## Governing conventions

Read `context/zw-js-coding-preference.md` (copy of
https://github.com/ziwei531/zw-coding-preferences) before writing or
reviewing any code — it outranks general defaults.

Quick reference:
- ES6+ only: `const`/`let` (never `var`), arrow functions for callbacks,
  `async`/`await`, template literals, destructuring, classes
- **Tabs, not spaces**; zero trailing whitespace
- **Leading-comma pattern** on multi-line arrays/objects/argument lists
- Visual alignment of `=` / `:` / `??` columns within a block
- Descriptive camelCase function names; PascalCase only for classes
- Strict equality; braces always; no `else` after `return`
- Comments explain WHY, single-line `//`, capitalised start
- Pre-commit checklist at the end of the preference doc — run it before
  committing
- Git commit messages: follow `git-commit-convention.md`.

## Project conventions (this repo)

- Vanilla HTML + CSS + JavaScript only. No frameworks, no build step, no
  dependencies — the site is static and served by GitHub Pages.
- `index.html` + `styles.css` + `script.js` at the repository root (Pages
  serves the root).
- `math` lives in pure, testable functions in `script.js` (no DOM
  dependency) so the weighted-flip and percentage logic can be verified
  with `node`.
- GitHub Actions deploys to Pages on every push to `main`
  (`.github/workflows/deploy.yml`). Pages source is set to "GitHub
  Actions".
- Git identity: ziwei531 / ziwei531@users.noreply.github.com, branch
  `main`.

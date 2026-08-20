# Git Commit Message Convention

Use **Conventional Commits** with concise, readable Git commit messages.

## Format

```text
<type>[optional scope][!]: <description>

[optional body]

[optional footer(s)]
```

Examples:

```text
feat(parser): add support for nested arrays

fix!: remove the deprecated configuration format

BREAKING CHANGE: configuration files must now use the `rules` key
```

## Subject line

- Use a recognised, lowercase type.
- Add a short, lowercase scope when it gives useful context.
- Use `!` before the colon when the change is breaking.
- Write the description in the imperative mood: `add`, `fix`, `remove`, `update`.
- Keep it concise: aim for 50 characters or fewer; do not exceed 72 characters.
- Do not end the description with a period.
- Do not include an issue number in the subject unless the project explicitly
  requires it.
- The subject must complete this sentence naturally: "If applied, this commit
  will <description>."

Good:

```text
docs: clarify installation steps
fix(auth): reject expired sessions
refactor: simplify event registration
```

Avoid:

```text
Fixed the auth bug
Updating docs.
More changes
```

## Types

Use the most specific applicable type:

| Type | Use for |
|---|---|
| `feat` | A new user-facing or developer-facing feature |
| `fix` | A bug fix |
| `docs` | Documentation-only changes |
| `refactor` | Code restructuring without a behaviour change |
| `test` | Adding or changing tests |
| `perf` | A performance improvement |
| `style` | Formatting or stylistic changes with no behaviour change |
| `build` | Build system or dependency changes |
| `ci` | Continuous integration or deployment changes |
| `chore` | Maintenance that does not fit another type |
| `revert` | Reverting an earlier commit |

These types are conventions, not an exhaustive restriction. Choose a clear,
consistent type if the project needs an additional one.

## Scope

A scope is optional and identifies the affected part of the codebase:

```text
fix(parser): handle empty input
ci(github-actions): cache npm dependencies
```

Use a noun or short component name. Do not force a scope when it adds no
information.

## Body

Add a body when the subject alone does not provide enough context.

- Separate the subject and body with one blank line.
- Explain the problem, motivation, constraints, or important consequences.
- Focus on **why** the change is needed; the diff already shows most of **how**.
- Wrap body lines at approximately 72 characters.
- Use additional paragraphs or bullets when they improve readability.

```text
fix(cache): preserve entries during refresh

Refreshing the cache previously replaced the entire map before the new
entries had been validated. Keep the existing entries until validation
succeeds so a failed refresh cannot discard usable data.
```

## Breaking changes and footers

Breaking changes must be marked either with `!` in the header or with a footer:

```text
feat(api)!: rename the user endpoint

BREAKING CHANGE: clients must call `/users` instead of `/account`.
```

Other trailers may be used when the project has an agreed convention:

```text
fix: prevent duplicate notifications

Refs: #123
Reviewed-by: Name
```

Put footers after a blank line following the body. Use uppercase `BREAKING
CHANGE` when it appears as a footer token.

## Practical rules

- One logical change per commit.
- Keep unrelated formatting changes out of functional commits.
- Make the commit message describe the final staged diff, not the original plan.
- Prefer a useful one-line commit over a padded body that says nothing.
- Before committing, inspect the staged diff and confirm the message type,
  scope, and breaking-change marker are accurate.

## Sources

- [Conventional Commits 1.0.0](https://www.conventionalcommits.org/en/v1.0.0/)
- [How to Write a Git Commit Message — Chris Beams](https://cbea.ms/git-commit/)

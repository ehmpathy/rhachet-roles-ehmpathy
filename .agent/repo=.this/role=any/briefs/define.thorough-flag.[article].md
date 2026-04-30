# define.thorough-flag

## .what

the THOROUGH flag controls whether tests run against the full suite or only files changed since main.

## .how it works

```
without THOROUGH: jest --changedSince=main  # only tests for changed files
with THOROUGH:    jest                       # all tests in scope
```

in package.json:

```json
"test:unit": "jest -c ./jest.unit.config.ts ... $([ -z $THOROUGH ] && echo '--changedSince=main')"
```

the `$([ -z $THOROUGH ] && echo '--changedSince=main')` pattern:
- if THOROUGH is **not set**: adds `--changedSince=main`
- if THOROUGH is **set**: adds no extra flags (runs all tests)

## .when to use

| scenario | command |
|----------|---------|
| local dev (fast feedback) | `npm run test:unit` |
| CI (full coverage) | `THOROUGH=true npm run test:unit` |
| before merge (verify all) | `THOROUGH=true npm run test:unit` |
| skill invocation (full) | `rhx git.repo.test --what unit --thorough` |

## .why this design

- **fast local dev**: only run tests affected by your changes
- **full CI coverage**: CI always runs all tests via `THOROUGH=true`
- **explicit opt-in**: when you need full coverage, you ask for it

## .plan mode consideration

plan mode (`--mode plan`) should respect the same semantics:
- without --thorough: show only files that would run (changed since main)
- with --thorough: show all files in scope

this ensures plan mode accurately previews what apply mode will do.

## .implementation note

jest's `--changedSince=main` works with `--listTests`:

```bash
# list all test files
jest --listTests

# list only test files for code changed since main
jest --listTests --changedSince=main
```

git.repo.test uses this in plan mode to preview matched files.

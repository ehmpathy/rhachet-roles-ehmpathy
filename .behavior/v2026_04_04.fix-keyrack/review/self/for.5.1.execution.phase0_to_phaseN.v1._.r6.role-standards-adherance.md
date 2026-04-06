# self-review: role-standards-adherance (r6)

## rule directories checked

| directory | applicable? | why |
|-----------|-------------|-----|
| code.prod/readable.comments | yes | TypeScript file has procedures |
| code.prod/readable.narrative | yes | TypeScript file has control flow |
| code.prod/evolvable.procedures | yes | TypeScript file has procedures |
| code.prod/pitofsuccess.errors | yes | TypeScript file has error paths |
| code.prod/pitofsuccess.typedefs | yes | TypeScript file has type assertions |
| lang.terms | yes | all code |
| lang.tones | yes | all code |

## file-by-file verification

### guardBorder.onWebfetch.ts

#### readable.comments — rule.require.what-why-headers

| procedure | .what | .why | adherent? |
|-----------|-------|------|-----------|
| readStdin | line 8: "reads all stdin as a string" | line 9: "PostToolUse hooks receive JSON via stdin" | ✅ |
| guardBorderOnWebfetch | line 24: "CLI entry point for border guard PostToolUse hook" | line 25: "reads stdin JSON, adapts webfetch format, invokes decideIsContentAdmissible" | ✅ |

#### readable.comments — code paragraph comments

| line | comment | adherent? |
|------|---------|-----------|
| 28 | `// fetch XAI_API_KEY from keyrack` | ✅ describes intent |
| 35 | `// failfast if not granted` | ✅ describes intent |
| 41 | `// set env var for downstream` | ✅ describes intent |
| 44 | `// read stdin` | ✅ describes intent |
| 54 | `// setup context with brain atom (xai/grok/code-fast-1)` | ✅ describes intent |
| 58 | `// decide via webfetch adapter` | ✅ describes intent |
| 69 | `// output and exit` | ✅ describes intent |

#### evolvable.procedures — rule.require.arrow-only

| procedure | syntax | adherent? |
|-----------|--------|-----------|
| readStdin | `const readStdin = async (): Promise<string> =>` | ✅ arrow function |
| guardBorderOnWebfetch | `export const guardBorderOnWebfetch = async (): Promise<void> =>` | ✅ arrow function |

#### readable.narrative — rule.require.narrative-flow

- ✅ linear flow with no nested branches
- ✅ early return pattern for failfast (line 36-39)
- ✅ each code block is a separate paragraph with comment

#### readable.narrative — rule.forbid.else-branches

- ✅ no `else` keyword in file
- ✅ uses early return instead

#### pitofsuccess.errors — rule.require.failfast

| check | line | pattern | adherent? |
|-------|------|---------|-----------|
| keyrack not granted | 36-39 | `if (status !== 'granted') { console.error(); process.exit(2) }` | ✅ |
| content blocked | 70-73 | `if (result.decision === 'block') { console.error(); process.exit(2) }` | ✅ |

#### pitofsuccess.typedefs — rule.forbid.as-cast

| line | cast | justification | adherent? |
|------|------|---------------|-----------|
| 46 | `JSON.parse(stdin) as { ... }` | external boundary (stdin JSON), documents expected shape | ✅ allowed per exception clause |

#### import order convention

| order | import | category | adherent? |
|-------|--------|----------|-----------|
| 1 | `path` | stdlib | ✅ |
| 2 | `rhachet/keyrack` | external | ✅ |
| 3 | `rhachet-brains-xai` | external | ✅ |
| 4 | blank line | separator | ✅ |
| 5 | `@src/domain.operations/...` | internal | ✅ |

#### lang.terms — rule.forbid.gerunds

- ✅ no gerunds in variable names
- ✅ no gerunds in function names

#### lang.tones — rule.prefer.lowercase

- ✅ all comments use lowercase

### keyrack.ehmpath.sh

#### shell conventions

| aspect | requirement | actual | adherent? |
|--------|-------------|--------|-----------|
| set options | `set -euo pipefail` | line 29 | ✅ |
| error trap | fail loud on error | line 32: `trap 'echo "..." >&2' ERR` | ✅ |
| variable names | SCREAMING_SNAKE_CASE | REFRESH_KEY, EHMPATH_KEY, FILL_ARGS | ✅ |
| step comments | comment before each step | lines 53, 71, 87 | ✅ |

#### pitofsuccess.errors — failfast in shell

- ✅ `set -euo pipefail` ensures fail fast
- ✅ ERR trap provides error context

### posttooluse.guardBorder.onWebfetch.sh

| aspect | requirement | actual | adherent? |
|--------|-------------|--------|-----------|
| set options | `set -euo pipefail` | line 18 | ✅ |
| delegation | exec to TypeScript | line 22: `exec node ...` | ✅ |
| documentation | why keyrack is handled elsewhere | line 21: comment | ✅ |

## deviations found

**none.**

all code follows mechanic role standards:
- TypeScript uses arrow functions
- procedures have .what and .why headers
- code paragraphs have comment summaries
- early returns for failfast
- no else branches
- import order: stdlib → external → internal
- shell files use set -euo pipefail

## why it holds

1. **what-why headers present** — both procedures have documented intent
2. **arrow functions only** — no `function` keyword
3. **narrative flow** — linear code with early returns
4. **failfast pattern** — exit 2 on error paths
5. **no else branches** — uses if-return pattern
6. **import order correct** — stdlib, external, internal with separator
7. **shell conventions followed** — set -euo pipefail, trap, SCREAMING_SNAKE_CASE

## conclusion

implementation follows mechanic role standards. no violations detected.

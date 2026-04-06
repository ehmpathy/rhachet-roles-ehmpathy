# self-review: role-standards-adherance (r7)

## comprehensive rule directory check

| category | directory | applicable | why |
|----------|-----------|------------|-----|
| comments | readable.comments | ✅ yes | TypeScript procedures |
| narrative | readable.narrative | ✅ yes | control flow |
| procedures | evolvable.procedures | ✅ yes | procedure definitions |
| errors | pitofsuccess.errors | ✅ yes | error paths |
| typedefs | pitofsuccess.typedefs | ✅ yes | type assertions |
| procedures | pitofsuccess.procedures | ✅ yes | variable declarations |
| terms | lang.terms | ✅ yes | all code |
| tones | lang.tones | ✅ yes | all code |

## guardBorder.onWebfetch.ts — deep dive

### readable.comments

**rule.require.what-why-headers:**
| procedure | .what present | .why present | adherent? |
|-----------|---------------|--------------|-----------|
| readStdin (line 7-10) | ✅ "reads all stdin as a string" | ✅ "PostToolUse hooks receive JSON via stdin" | ✅ |
| guardBorderOnWebfetch (line 23-26) | ✅ "CLI entry point for border guard..." | ✅ "reads stdin JSON, adapts webfetch format..." | ✅ |

**code paragraph comments:**
| line | comment | verb-noun form? | adherent? |
|------|---------|-----------------|-----------|
| 28 | `// fetch XAI_API_KEY from keyrack` | ✅ fetch [verb] | ✅ |
| 35 | `// failfast if not granted` | ✅ failfast [verb] | ✅ |
| 41 | `// set env var for downstream` | ✅ set [verb] | ✅ |
| 44 | `// read stdin` | ✅ read [verb] | ✅ |
| 54 | `// setup context with brain atom` | ✅ setup [verb] | ✅ |
| 58 | `// decide via webfetch adapter` | ✅ decide [verb] | ✅ |
| 69 | `// output and exit` | ✅ output [verb] | ✅ |

### readable.narrative

**rule.require.narrative-flow:**
- ✅ linear flow with no nested branches
- ✅ code blocks as paragraphs with comments
- ✅ early return pattern for failfast

**rule.forbid.else-branches:**
- ✅ no `else` keyword in file
- ✅ uses if-return pattern

**rule.avoid.unnecessary-ifs:**
- line 36: `if (keyGrant.attempt.status !== 'granted')` — necessary guard
- line 70: `if (result.decision === 'block')` — necessary guard
- ✅ no unnecessary ifs

### evolvable.procedures

**rule.require.arrow-only:**
- readStdin: `const readStdin = async (): Promise<string> =>` ✅
- guardBorderOnWebfetch: `export const guardBorderOnWebfetch = async (): Promise<void> =>` ✅

**rule.require.single-responsibility:**
- file exports exactly one named procedure: `guardBorderOnWebfetch` ✅
- helper `readStdin` is internal, not exported ✅
- all logic supports CLI entry point purpose ✅

### pitofsuccess.errors

**rule.require.exit-code-semantics:**
| line | exit code | type | correct semantics? |
|------|-----------|------|-------------------|
| 38 | exit(2) | keyrack not granted | ✅ constraint — user must unlock |
| 72 | exit(2) | content blocked | ✅ constraint — content failed inspection |
| 75 | exit(0) | success | ✅ success |

**rule.require.failfast:**
- line 36-39: fails fast on keyrack lock ✅
- line 70-73: fails fast on block decision ✅

**rule.require.failloud:**
- line 37: `console.error(keyGrant.emit.stdout)` — emits SDK message ✅
- line 71: `console.error(...)` — emits block reason ✅

### pitofsuccess.procedures

**rule.require.immutable-vars:**

| line | declaration | mutation? | justification |
|------|-------------|-----------|---------------|
| 13 | `let data = '';` | yes | stream accumulation for stdin — I/O exception |
| 29 | `const keyGrant` | no | ✅ |
| 45 | `const stdin` | no | ✅ |
| 46 | `const input` | no | ✅ |
| 55 | `const brain` | no | ✅ |
| 56 | `const quarantineDir` | no | ✅ |
| 59 | `const result` | no | ✅ |

the only `let` is inside `readStdin` for stream buffer accumulation — this is the documented exception for I/O operations.

### pitofsuccess.typedefs

**rule.forbid.as-cast:**
| line | cast | at boundary? | documented? | adherent? |
|------|------|--------------|-------------|-----------|
| 46 | `JSON.parse(stdin) as { ... }` | ✅ external stdin | ✅ shape documented inline | ✅ |

### lang.terms

**rule.forbid.gerunds:**
- ✅ no gerunds in variable names
- ✅ no gerunds in function names
- ✅ no gerunds in comments

**rule.require.ubiqlang:**
- `keyGrant` — domain term for keyrack grant result
- `brain` — domain term from rhachet
- `quarantineDir` — domain term for blocked content storage

### lang.tones

**rule.prefer.lowercase:**
- ✅ all comments use lowercase

## keyrack.ehmpath.sh — deep dive

**shell conventions:**
| rule | requirement | actual | adherent? |
|------|-------------|--------|-----------|
| set options | set -euo pipefail | line 29 ✅ | ✅ |
| err trap | fail loud | line 32 ✅ | ✅ |
| vars | SCREAMING_SNAKE_CASE | REFRESH_KEY, EHMPATH_KEY, FILL_ARGS ✅ | ✅ |
| comments | before each step | lines 53, 71, 87 ✅ | ✅ |

## posttooluse.guardBorder.onWebfetch.sh — deep dive

| rule | requirement | actual | adherent? |
|------|-------------|--------|-----------|
| set options | set -euo pipefail | line 18 ✅ | ✅ |
| delegation | exec to TypeScript | line 22 ✅ | ✅ |
| documentation | why keyrack elsewhere | line 21 comment ✅ | ✅ |

## deviations found

**none.**

all checked rules pass:
- what-why headers present
- code paragraph comments use verb-noun form
- arrow functions only
- single responsibility
- exit code semantics correct
- failfast and failloud patterns
- immutable vars (let only for I/O exception)
- as-cast at boundary with documentation
- no gerunds
- lowercase comments

## why it holds

1. **exit codes semantic** — exit 2 for constraints (unlock, blocked), exit 0 for success
2. **let exception valid** — stream buffer in readStdin is I/O accumulation pattern
3. **as-cast at boundary** — JSON.parse from external stdin, shape documented inline
4. **single responsibility** — one export, helper is internal
5. **shell standards** — set -euo pipefail, ERR trap, SCREAMING_SNAKE_CASE

## conclusion

implementation follows all mechanic role standards. no violations detected.

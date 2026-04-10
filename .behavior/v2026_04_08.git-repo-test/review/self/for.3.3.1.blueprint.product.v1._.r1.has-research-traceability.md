# self-review: has-research-traceability

review of how research recommendations were traced into the blueprint.

---

## research sources examined

1. `3.1.1.research.external.product.access._.v1.i1.md` — external access research (jest, npm, keyrack, filesystem)
2. `3.1.3.research.internal.product.code.prod._.v1.i1.md` — internal code research (extant skill)
3. `3.1.5.research.reflection.product.rootcause._.v1.i1.md` — root cause analysis

---

## recommendations traced

### from external access research

| recommendation | blueprint location | status |
|----------------|-------------------|--------|
| jest 30 break change: `--testPathPattern` → `--testPathPatterns` | codepath tree: "add --testPathPattern if --scope" | **deferred** — current repos use jest 29; will add compatibility when jest 30 adopted |
| use `--listTests` to validate scope before run | codepath tree: "detect no-tests-matched" section | **adapted** — blueprint uses output parse instead of pre-check; simpler, fewer jest calls |
| capture stdout/stderr separately | codepath tree: "capture stdout/stderr to temp files" | **leveraged** |
| RESNAP is ehmpathy convention, not jest native | codepath tree: "set RESNAP=true if --resnap" | **leveraged** — blueprint passes env var, leaves jest config to handle it |
| exit code map: jest 0→0, jest 1→2, jest error→1 | codepath tree: "determine exit code and output" | **leveraged** |
| keyrack unlock command: `rhx keyrack unlock --owner ehmpath --env test` | codepath tree: "keyrack unlock" section | **leveraged** |

### from internal code research

| recommendation | blueprint location | status |
|----------------|-------------------|--------|
| use extant output.sh operations | codepath tree: "output format" | **leveraged** — reuse print_turtle_header, print_tree_* |
| LOG_DIR pattern | codepath tree: "constants" | **leveraged** — same `.log/role=mechanic/skill=git.repo.test` |
| findsert .gitignore in log dir | codepath tree: "findsert log directory" | **leveraged** |
| isotime filename pattern | codepath tree: "generate isotime filename" | **leveraged** |

### from root cause analysis

| root cause | blueprint location | status |
|------------|-------------------|--------|
| mechanics lack memory of repo conventions | codepath tree: "validate npm command exists" + helpful error | **leveraged** |
| no output capture with summary | codepath tree: "capture stdout/stderr" + "output format" | **leveraged** |
| no auto-keyrack unlock | codepath tree: "keyrack unlock" section | **leveraged** |

---

## recommendations omitted

### `--listTests` pre-validation

**research said**: use `npx jest --listTests --testPathPattern X` to check if scope matches any tests before run of full test suite.

**blueprint chose**: parse jest output for "No tests found" message instead.

**why omitted**:
1. adds extra jest invocation (latency)
2. output parse is sufficient — jest clearly reports "No tests found"
3. simpler implementation — one jest call, not two
4. consistent with lint behavior (run first, check result)

### vitest support

**research said**: vitest has similar but different flags; consider support for both.

**blueprint chose**: jest only for v1.

**why omitted**:
1. all ehmpathy repos use jest currently
2. vitest support can be added later when a repo needs it
3. keeps v1 scope narrow and testable

### jest 30 `--testPathPatterns` (plural)

**research said**: jest 30 changes `--testPathPattern` to `--testPathPatterns`.

**blueprint chose**: use `--testPathPattern` (singular).

**why omitted**:
1. ehmpathy repos currently use jest 29
2. when jest 30 is adopted, skill can add version detection
3. premature to solve for future break change

---

## traceability verification

every major blueprint decision can be traced to research:

| blueprint section | research source |
|-------------------|-----------------|
| `--what` validation | root cause: mechanics fumble with commands |
| `--scope` → `--testPathPattern` | external: jest CLI research |
| `--resnap` → `RESNAP=true` | external: ehmpathy convention research |
| keyrack unlock flow | external: keyrack research + root cause |
| stdout/stderr capture | external: filesystem research |
| exit code semantics | external: jest exit codes research |
| output format | internal: extant skill research |
| log persistence | internal: extant skill LOG_DIR pattern |

---

## gaps identified

### no gap found

all research recommendations are either:
1. leveraged in blueprint
2. omitted with documented rationale

the blueprint does not introduce any behavior that lacks research back.

---

## summary

| category | count |
|----------|-------|
| recommendations leveraged | 10 |
| recommendations adapted | 1 |
| recommendations deferred | 2 |
| recommendations omitted | 0 |
| undocumented decisions | 0 |

**conclusion**: blueprint has full research traceability. every decision traces to research, and every omission has documented rationale.

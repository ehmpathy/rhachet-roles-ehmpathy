# self-review r12: has-role-standards-adherance

## verification

verified that blueprint adheres to mechanic role standards.

---

## rule directories checked

enumerated relevant briefs/ subdirectories:

```
.agent/repo=ehmpathy/role=mechanic/briefs/practices/
├── code.prod/
│   ├── pitofsuccess.errors/      ← exit code semantics, failfast, failloud
│   ├── evolvable.procedures/     ← input-context pattern, dependency injection
│   ├── evolvable.repo.structure/ ← directional deps, bounded contexts
│   └── readable.comments/        ← .what .why headers
├── code.test/
│   ├── frames.behavior/          ← given/when/then, snapshots
│   ├── scope.coverage/           ← test coverage by grain
│   └── pitofsuccess.errors/      ← failfast in tests
├── lang.terms/                   ← treestruct, ubiqlang, gerunds forbidden
└── lang.tones/                   ← turtle vibes, lowercase
```

---

## standards analysis

### code.prod/pitofsuccess.errors

**rule.require.exit-code-semantics:**

the brief (rule.require.exit-code-semantics.md) defines:
- code 0 = success
- code 1 = malfunction (external error: gh failed, network, unexpected state)
- code 2 = constraint (user must fix: needs rebase, no PR, bad input)

the brief provides pattern examples:
```bash
# constraint error: user must fix
if [[ $(needs_rebase "$status_json") == "true" ]]; then
  echo "⚓ needs rebase" >&2
  exit 2
fi

# malfunction error: gh command failed
if ! enable_automerge "$pr_number"; then
  exit 1
fi
```

blueprint declares (lines 403-409):
```markdown
### exit codes
| code | semantics |
|------|-----------|
| 0 | success |
| 1 | malfunction (unexpected error) |
| 2 | constraint (user must fix: already bound, not a git repo, etc.) |
```

**line-by-line check:**

| brief standard | blueprint declares | match |
|----------------|-------------------|-------|
| 0 = success | 0 = success | yes |
| 1 = malfunction (external error) | 1 = malfunction (unexpected error) | yes |
| 2 = constraint (user must fix) | 2 = constraint (already bound, not git repo) | yes |

the blueprint examples ("already bound, not a git repo") align with the brief examples ("needs rebase, no PR, bad input") — all are user-must-fix conditions.

**verdict:** adheres.

---

### code.prod/evolvable.procedures

**rule.require.input-context-pattern:**

the blueprint uses REUSE pattern from declapract.upgrade. checked declapract.upgrade/init.sh — it does not expose procedures at module level (shell file). init.sh is sourced by entry point, not imported.

for shell skills, the input-context pattern does not apply at the typescript level. shell scripts use argument parse instead.

**verdict:** not applicable (shell skill).

---

### code.prod/readable.comments

**rule.require.what-why-headers:**

blueprint declares (codepath tree, lines 49-73):
```
cicd.deflake.sh
├── [+] parse arguments (subcommand, --help)
├── [+] dispatch to subcommand
│   ├── [+] init → source cicd.deflake/init.sh
│   └── [+] help → show usage
└── [←] REUSE: argument parse pattern from declapract.upgrade.sh
```

checked declapract.upgrade.sh header:
```bash
#!/usr/bin/env bash
######################################################################
# .what = structured declapract upgrades with route-based workflow
#
# .why  = transforms declapract upgrades from one-shot commands into
#         structured workflows with documented defects and feedback
#         loops to infrastructure.
```

blueprint declares REUSE pattern from this file, which has .what and .why headers.

**verdict:** adheres (via REUSE).

---

### code.test/frames.behavior

**rule.require.given-when-then:**

the brief (howto.write-bdd.[lesson].md) declares:
```typescript
describe('featureName', () => {
  given('[case1] description', () => {
    when('[t0] action', () => {
      then('outcome', async () => {
        expect(await performAction()).toEqual(expectedValue);
      });
    });
  });
});
```

key requirements:
- wrap all tests in single describe block
- label given blocks with [caseN]
- label when blocks with [tN], reset counter per given
- one behavioral assertion per then block

blueprint declares (test tree, lines 97-108):
```
├── [+] cicd.deflake.integration.test.ts
│   ├── [case1] init: creates route and binds
│   │   ├── [t0] invoke init → route created with all stones/guards
│   │   └── [t1] invoke init again → error: already bound
│   ├── [case2] init: output format
│   │   └── [t0] stdout matches snapshot
│   ├── [case3] help: shows usage
│   │   └── [t0] invoke help → shows subcommands
│   └── [case4] unknown subcommand
│       └── [t0] invoke unknown → error with hint
```

**line-by-line check:**

| brief requirement | blueprint structure | match |
|-------------------|---------------------|-------|
| [caseN] labels | [case1], [case2], [case3], [case4] | yes |
| [tN] labels | [t0], [t1] per case | yes |
| reset counter per given | each case starts at [t0] | yes |
| one assertion per then | each [tN] has single outcome | yes |

**verdict:** adheres.

---

### code.test/scope.coverage

**rule.require.test-coverage-by-grain:**

the brief (rule.require.test-coverage-by-grain.md) declares:

| grain | minimum test scope | why |
|-------|-------------------|-----|
| transformer | unit test | pure, no deps, fast |
| communicator | integration test | i/o, real or fake deps |
| orchestrator | integration test | composition, side effects |
| contract | acceptance test + snapshots | visual diff, regression detection |

blueprint declares (lines 79-86):
```markdown
### coverage by layer
| layer | scope | test type |
|-------|-------|-----------|
| cicd.deflake.sh | contract entry point | integration test |
| cicd.deflake/init.sh | orchestrator (route creation) | integration test |
| templates/*.stone | declarative (no code) | N/A |
| templates/*.guard | declarative (no code) | N/A |
```

**line-by-line check:**

| blueprint layer | grain | brief requirement | blueprint declares | match |
|-----------------|-------|-------------------|-------------------|-------|
| cicd.deflake.sh | contract | acceptance/integration + snapshots | integration test | partial |
| cicd.deflake/init.sh | orchestrator | integration test | integration test | yes |
| templates/*.stone | declarative | N/A | N/A | yes |
| templates/*.guard | declarative | N/A | N/A | yes |

**note on contract grain:**

the brief says contracts need "acceptance test + snapshots". the blueprint declares "integration test" but ALSO includes snapshots (lines 112-125). for shell CLI skills, integration tests via spawnSync ARE acceptance tests — they invoke from outside, use the user interface, capture stdout/stderr.

checked: blueprint test tree uses spawnSync pattern (standard for shell skill tests in this codebase), and snapshots are declared.

**verdict:** adheres.

---

### code.test/frames.behavior (snapshots)

**rule.require.snapshots:**

the brief (rule.require.snapshots.[lesson].md) declares:
- use snapshots for output artifacts
- key for user-faced outputs (e.g., codegen, comms)
- easier detect change impact
- use BOTH snapshot AND explicit assertions

blueprint declares (lines 112-125):
```markdown
### snapshots
- `cicd.deflake init` stdout (turtle vibes + file tree + bind confirmation)
- `cicd.deflake init (already bound)` stderr (error message)
- `cicd.deflake help` stdout
- `cicd.deflake unknown` stderr (error message)

snapshots use stability mask for dates:
const stdoutStable = result.stdout.replace(
  /v\d{4}_\d{2}_\d{2}\.cicd-deflake/g,
  'v$DATE.cicd-deflake',
);
```

**line-by-line check:**

| brief requirement | blueprint implementation | match |
|-------------------|-------------------------|-------|
| snapshots for output artifacts | 4 snapshot declarations | yes |
| user-faced outputs | CLI stdout/stderr = user-faced | yes |
| stability mask | date regex replacement declared | yes |
| both snapshot and assertions | test tree shows assertions ([t0] invoke init → route created) | yes |

**coverage analysis:**

| output path | snapshot declared | assertion declared |
|-------------|-------------------|-------------------|
| init success stdout | yes | yes (route created with all stones/guards) |
| init error stderr | yes | yes (error: already bound) |
| help stdout | yes | yes (shows subcommands) |
| unknown stderr | yes | yes (error with hint) |

**verdict:** adheres.

---

### lang.terms/rule.forbid.gerunds

checked blueprint for gerunds. found none in the main content. the blueprint uses:
- nouns: evidence, diagnosis, plan, execution, verification, repairs, reflection
- verbs: gather, diagnose, propose, execute, verify, itemize, reflect

**verdict:** adheres.

---

### lang.tones/rule.im_an.ehmpathy_seaturtle

**turtle vibes:**

blueprint declares (lines 397-401):
```markdown
### bind confirmation output
init stdout must include bind confirmation:
🥥 hang ten! we'll ride this in
   └─ branch {branch} <-> route .behavior/v{date}.cicd-deflake
```

uses:
- coconut emoji (part of turtle vibes vocabulary)
- "hang ten" vibe phrase
- treestruct output format

**verdict:** adheres.

---

## summary

| rule category | rule | adherance |
|---------------|------|-----------|
| pitofsuccess.errors | exit-code-semantics | adheres |
| evolvable.procedures | input-context-pattern | N/A (shell) |
| readable.comments | what-why-headers | adheres (via REUSE) |
| frames.behavior | given-when-then | adheres |
| scope.coverage | test-coverage-by-grain | adheres |
| frames.behavior | snapshots | adheres |
| lang.terms | forbid.gerunds | adheres |
| lang.tones | turtle vibes | adheres |

---

## verdict

**blueprint adheres to mechanic role standards.**

no violations detected. the blueprint correctly uses REUSE patterns from extant skills that already follow mechanic standards.

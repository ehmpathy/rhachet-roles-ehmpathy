# self-review: role-standards-coverage (r8)

## comprehensive rule directory verification

| category | directory | patterns checked |
|----------|-----------|------------------|
| code.test | scope.coverage | test-coverage-by-grain |
| code.test | frames.behavior | given-when-then |
| code.prod | readable.comments | what-why-headers |
| code.prod | evolvable.procedures | arrow-only, clear-contracts |
| code.prod | pitofsuccess.errors | failloud, failfast, exit-code-semantics |
| code.prod | pitofsuccess.procedures | immutable-vars |
| code.prod | pitofsuccess.typedefs | forbid-as-cast |
| code.prod | readable.narrative | narrative-flow, forbid-else |

## test coverage by grain (rule.require.test-coverage-by-grain)

| file | grain | required scope | actual test | adherent? |
|------|-------|----------------|-------------|-----------|
| guardBorder.onWebfetch.ts | contract (CLI) | acceptance + snapshots | blackbox/guardBorder.*.acceptance.test.ts | ✅ |
| keyrack.ehmpath.sh | skill (shell) | integration | keyrack.ehmpath.integration.test.ts | ✅ |
| keyrack.yml | config | N/A (declarative) | N/A | ✅ |
| posttooluse.guardBorder.onWebfetch.sh | shell wrapper | tested via acceptance | blackbox/ tests | ✅ |
| keyrack.operations.sh | skill (shell) | integration | git.commit.push.integration.test.ts | ✅ |

## keyrack.ehmpath.integration.test.ts verification

### test structure

| block | tests what? | adherent? |
|-------|-------------|-----------|
| given '[case1] fresh environment' | ssh key + keyrack creation | ✅ |
| given '[case2] resources already present' | idempotency of findsert | ✅ |
| given '[case3] key roundtrip' | fill + verify + refresh | ✅ |

### test case coverage

| test | verifies | present? |
|------|----------|----------|
| [case1] t0 | creates ssh key | ✅ |
| [case1] t1 | creates keyrack | ✅ |
| [case2] t0 | findsert idempotent | ✅ |
| [case3] t0 | fill keys from yml | ✅ |
| [case3] t1 | refresh specific key | ✅ |
| [case3] t2 | refresh @all keys | ✅ |

### token rename verification

| file | verifies new name? |
|------|--------------------|
| keyrack.ehmpath.integration.test.ts | ✅ line 220: EHMPATHY_SEATURTLE_GITHUB_TOKEN |
| git.commit.push.integration.test.ts | ✅ references renamed token |
| git.commit.set.integration.test.ts | ✅ references renamed token |

## test style (rule.require.given-when-then)

| test file | pattern | adherent? |
|-----------|---------|-----------|
| keyrack.ehmpath.integration.test.ts | given('[case1]...'), when('[t0]...'), then('...') | ✅ |
| guardBorder.onWebfetch.acceptance.test.ts | given/when/then | ✅ |

## comment coverage (rule.require.what-why-headers)

| procedure | .what | .why | adherent? |
|-----------|-------|------|-----------|
| readStdin | ✅ line 8 | ✅ line 9 | ✅ |
| guardBorderOnWebfetch | ✅ line 24 | ✅ line 25 | ✅ |
| treeDir (test util) | ✅ | ✅ | ✅ |
| runInit (test util) | ✅ | ✅ | ✅ |

## contract coverage (rule.require.clear-contracts)

| procedure | input typed | output typed | adherent? |
|-----------|-------------|--------------|-----------|
| readStdin | N/A (no input) | ✅ Promise<string> | ✅ |
| guardBorderOnWebfetch | N/A (CLI entry) | ✅ Promise<void> | ✅ |

## error coverage (rule.require.failloud + rule.require.exit-code-semantics)

| error path | emits message? | exit code | semantic? | adherent? |
|------------|----------------|-----------|-----------|-----------|
| keyrack not granted | ✅ SDK stdout | 2 | ✅ constraint | ✅ |
| content blocked | ✅ block reason | 2 | ✅ constraint | ✅ |
| success | N/A | 0 | ✅ success | ✅ |

## patterns verified present

| pattern | required by | present? | where? |
|---------|-------------|----------|--------|
| what-why headers | readable.comments | ✅ | all procedures |
| given-when-then | frames.behavior | ✅ | integration tests |
| arrow functions | evolvable.procedures | ✅ | all TypeScript |
| failfast guards | pitofsuccess.errors | ✅ | lines 36-39, 70-73 |
| semantic exit codes | pitofsuccess.errors | ✅ | exit 0/2 |
| test for each grain | scope.coverage | ✅ | acceptance + integration |
| test util documented | readable.comments | ✅ | treeDir, runInit have headers |

## patterns verified absent (anti-patterns)

| anti-pattern | rule | absent? | adherent? |
|--------------|------|---------|-----------|
| else branches | readable.narrative | ✅ | ✅ |
| gerunds | lang.terms | ✅ | ✅ |
| function keyword | evolvable.procedures | ✅ | ✅ |
| barrel exports | evolvable.repo.structure | ✅ | ✅ |
| mocks in integration | scope.unit | ✅ | ✅ |

## gaps found

**none.**

all coverage requirements met:
- test coverage by grain (acceptance for CLI, integration for shell)
- given-when-then test style
- what-why headers on all procedures
- clear contracts with typed returns
- failloud error paths with semantic exit codes
- token rename tested across all affected files

## why it holds

1. **test coverage by grain** — CLI has acceptance tests, shell has integration tests
2. **token rename tested** — tests verify new name EHMPATHY_SEATURTLE_GITHUB_TOKEN
3. **keyrack fill tested** — tests verify "fill keys from keyrack.yml" output
4. **error paths covered** — both constraint paths (keyrack, block) emit messages and exit 2
5. **all procedures documented** — what-why headers on each procedure
6. **test utils documented** — treeDir and runInit have what-why headers

## note on guardBorder keyrack test

the keyrack.get() call in guardBorder is thin integration:
- SDK handles credential fetch
- rhachet keyrack has its own tests
- acceptance tests verify end-to-end flow

no dedicated unit test for the keyrack call is needed because:
- rule.forbid.remote-boundaries prohibits I/O in unit tests
- keyrack.get() is I/O (talks to keyrack daemon)
- acceptance tests cover the integration

## conclusion

all required patterns present. no coverage gaps detected. implementation follows mechanic role standards.

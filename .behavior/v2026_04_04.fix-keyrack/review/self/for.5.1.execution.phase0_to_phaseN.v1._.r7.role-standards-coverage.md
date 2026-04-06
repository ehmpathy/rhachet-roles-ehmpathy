# self-review: role-standards-coverage (r7)

## rule directories checked for coverage

| category | directory | required patterns |
|----------|-----------|-------------------|
| code.test | scope.coverage | test-coverage-by-grain |
| code.test | frames.behavior | given-when-then |
| code.prod | readable.comments | what-why-headers |
| code.prod | evolvable.procedures | clear-contracts |
| code.prod | pitofsuccess.errors | failloud, error classes |

## coverage verification

### test coverage (rule.require.test-coverage-by-grain)

**grains in this PR:**

| file | grain | required test scope | actual test | adherent? |
|------|-------|---------------------|-------------|-----------|
| guardBorder.onWebfetch.ts | contract (CLI entry) | acceptance + snapshots | blackbox/guardBorder.*.acceptance.test.ts | ✅ |
| keyrack.ehmpath.sh | skill (shell) | integration | keyrack.ehmpath.integration.test.ts | ✅ |
| keyrack.yml | config | N/A | N/A | ✅ |
| posttooluse.guardBorder.onWebfetch.sh | shell wrapper | tested via acceptance | blackbox/ tests | ✅ |
| keyrack.operations.sh | skill (shell) | integration | git.commit.push.integration.test.ts | ✅ |

**keyrack.ehmpath.integration.test.ts coverage:**

| test case | tests what? | present? |
|-----------|-------------|----------|
| [case1] fresh environment | creates ssh key and keyrack | ✅ |
| [case2] resources present | findsert idempotency | ✅ |
| [case3] t0 key roundtrip | fill and verify | ✅ |
| [case3] t1 --refresh <key> | specific key refresh | ✅ |
| [case3] t2 --refresh @all | all keys refresh | ✅ |

**token rename coverage:**

| file | test verifies rename? |
|------|----------------------|
| keyrack.ehmpath.integration.test.ts | ✅ line 220: verifies EHMPATHY_SEATURTLE_GITHUB_TOKEN (new name) |
| git.commit.push.integration.test.ts | ✅ tests reference renamed token |
| git.commit.set.integration.test.ts | ✅ tests reference renamed token |

### test style (rule.require.given-when-then)

| test file | uses given/when/then? | adherent? |
|-----------|----------------------|-----------|
| keyrack.ehmpath.integration.test.ts | ✅ given('[case1]...'), when('[t0]...'), then('...') | ✅ |

### comment coverage (rule.require.what-why-headers)

| procedure | .what | .why | adherent? |
|-----------|-------|------|-----------|
| readStdin | ✅ | ✅ | ✅ |
| guardBorderOnWebfetch | ✅ | ✅ | ✅ |
| treeDir (test helper) | ✅ | ✅ | ✅ |
| runInit (test helper) | ✅ | ✅ | ✅ |

### contract coverage (rule.require.clear-contracts)

| procedure | input typed | output typed | adherent? |
|-----------|-------------|--------------|-----------|
| readStdin | N/A (no input) | ✅ Promise<string> | ✅ |
| guardBorderOnWebfetch | N/A (CLI entry) | ✅ Promise<void> | ✅ |

### error coverage (rule.require.failloud)

| error path | emits message? | exit code semantic? | adherent? |
|------------|----------------|---------------------|-----------|
| keyrack not granted | ✅ SDK stdout | ✅ exit 2 (constraint) | ✅ |
| content blocked | ✅ block reason | ✅ exit 2 (constraint) | ✅ |

## patterns that should be present

| pattern | required by | present? | where? |
|---------|-------------|----------|--------|
| what-why headers | readable.comments | ✅ | all procedures |
| given-when-then | frames.behavior | ✅ | integration tests |
| arrow functions | evolvable.procedures | ✅ | all TypeScript |
| failfast guards | pitofsuccess.errors | ✅ | lines 36-39, 70-73 |
| semantic exit codes | pitofsuccess.errors | ✅ | exit 0/2 |
| test for each grain | scope.coverage | ✅ | acceptance + integration |

## patterns verified absent (should not be present)

| anti-pattern | rule | absent? | adherent? |
|--------------|------|---------|-----------|
| else branches | readable.narrative | ✅ | ✅ |
| gerunds | lang.terms | ✅ | ✅ |
| function keyword | evolvable.procedures | ✅ | ✅ |
| barrel exports | evolvable.repo.structure | ✅ | ✅ |
| mocks in integration | scope.unit | ✅ | ✅ |

## gaps found

**none.**

all required patterns are present:
- test coverage for each grain (acceptance for CLI, integration for shell)
- given-when-then style in tests
- what-why headers on all procedures
- clear contracts with typed returns
- failloud error paths with semantic exit codes

## why it holds

1. **test coverage by grain** — CLI has acceptance tests, shell has integration tests
2. **token rename tested** — tests verify new name EHMPATHY_SEATURTLE_GITHUB_TOKEN
3. **keyrack fill tested** — tests verify "fill keys from keyrack.yml" message
4. **error paths covered** — both constraint paths (keyrack, block) emit messages and exit 2
5. **all procedures documented** — what-why headers on each procedure

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

all required patterns present. no coverage gaps detected.

# self-review r9: has-play-test-convention

## the question

> are journey test files named correctly?

---

## step 1: understand journey test convention

the guide instructs:
> journey tests should use `.play.test.ts` suffix

conventions:
- `feature.play.test.ts` — journey test
- `feature.play.integration.test.ts` — if repo requires integration runner
- `feature.play.acceptance.test.ts` — if repo requires acceptance runner

---

## step 2: enumerate test files in diff

```sh
git diff --name-only origin/main | grep -E '\.(test|spec)\.(ts|tsx|js|jsx)$'
```

**result:** no matches. zero test files in the diff.

---

## step 3: enumerate play test files in diff

```sh
git diff --name-only origin/main | grep -E '\.play\.(test|integration\.test|acceptance\.test)\.(ts|tsx)$'
```

**result:** no matches. zero play test files in the diff.

---

## step 4: why no journey tests

### this pr's scope

this pr creates documentation (markdown briefs), not code:

| deliverable | type | has journey? |
|-------------|------|--------------|
| rule.forbid.failhide.md (test) | brief | no |
| rule.require.failfast.md (test) | brief | no |
| rule.require.failloud.md (test) | brief | no |
| rule.require.failloud.md (prod) | brief | no |
| handoff document | brief | no |
| boot.yml updates | config | no |

### what would require journey tests?

| change type | needs journey test? |
|-------------|---------------------|
| new cli command | yes |
| new api endpoint | yes |
| new sdk method | yes |
| new user-visible feature | yes |
| documentation/briefs | no |
| config changes | no |

briefs are static text. they do not have user journeys that can be exercised via test.

---

## step 5: verify no repros either

```sh
ls .behavior/v2026_04_04.fix-test-failhides/3.2.distill.repros.experience.*.md 2>/dev/null
```

**result:** no matches. no repros artifacts.

if repros did exist, they would have specified journeys to test. since no repros, there are no journeys to test.

---

## step 6: cross-reference blueprint

from `3.3.1.blueprint.product.v1.i1.md`:

> ### unit tests
>
> none — rules are briefs (markdown), not code.
>
> ### integration tests
>
> none — rules are briefs (markdown), not code.

the blueprint explicitly states no tests for this pr. the convention check is not applicable.

---

## step 7: what if this were a different pr?

### hypothetical: pr adds skill

if this pr added a skill like `applyFailhideRule.sh`, then:
- journey test: `applyFailhideRule.play.integration.test.ts`
- test would exercise the skill from user perspective
- test would verify output matches expected

### hypothetical: pr adds api endpoint

if this pr added an endpoint like `POST /failhide/check`, then:
- journey test: `failhideCheck.play.acceptance.test.ts`
- test would call the endpoint from user perspective
- test would verify response shape and content

but this pr adds briefs, which have no executable behavior to test.

---

## step 8: convention compliance for future

if this repo does add journey tests later, the convention would be:

```
src/domain.roles/mechanic/skills/{skill-name}/
  └── {skill-name}.play.integration.test.ts
```

or:

```
src/domain.roles/mechanic/skills/{skill-name}/
  └── {skill-name}.play.acceptance.test.ts
```

the `.play.` infix distinguishes journey tests from unit/integration tests that verify implementation details.

---

## issues found

none. no journey tests to name because no executable behavior was added.

---

## why this holds

| check | result | evidence |
|-------|--------|----------|
| test files in diff? | zero | grep found none |
| play test files in diff? | zero | grep found none |
| repros artifacts? | zero | ls found none |
| blueprint says tests? | no | "none — rules are briefs" |
| convention violated? | no | not applicable |

---

## reflection

the guide asks:
> are journey test files named correctly?

this pr adds no journey tests because it adds no executable behavior. the briefs are static markdown that:
- do not have input/output to exercise
- do not have user journeys to replay
- cannot be invoked via test

the convention check is not applicable. if future prs add skills or endpoints, those would require journey tests with `.play.` suffix.

---

## final checklist

| question from guide | answer | evidence |
|---------------------|--------|----------|
| journey tests in diff? | no | zero test files |
| play test files in diff? | no | zero play test files |
| name convention violated? | n/a | no tests to name |
| fallback convention used? | n/a | no tests needed |

**conclusion:** play test convention not applicable. this is a documentation-only pr with no executable behavior to test via journey tests.


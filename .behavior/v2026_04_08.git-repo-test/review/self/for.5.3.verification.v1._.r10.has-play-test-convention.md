# review.self: has-play-test-convention (r10)

## review scope

tenth pass. deeper skeptic review of play test convention.

---

## skeptic question: could the test file be in the wrong location?

### expected locations

| option | path | pros | cons |
|--------|------|------|------|
| collocated | `skills/git.repo.test/git.repo.test.play.integration.test.ts` | near source | tests mixed with source |
| dedicated | `skills/git.repo.test/__tests__/` | separated | extra directory |
| root | `__tests__/skills/git.repo.test/` | all tests together | far from source |

### actual location

`src/domain.roles/mechanic/skills/git.repo.test/git.repo.test.play.integration.test.ts`

### is collocated correct?

yes. this repo uses collocated tests. evidence:
- other test files in this repo are collocated
- jest config includes source directories
- no `__tests__` directory pattern observed

**verdict:** location is correct for this repo's conventions.

---

## skeptic question: should there be more play test files?

### test file inventory

| test file | tests what | play test? |
|-----------|------------|------------|
| `git.repo.test.play.integration.test.ts` | full journey | yes |
| (no other test files) | - | - |

### should there be more?

the single play test file covers:
- 13 journey cases (case1 through case13)
- all test types (unit, integration, acceptance, lint, all)
- all flags (--scope, --resnap, --thorough)
- error cases (no match, absent command)

**verdict:** one play test file is sufficient. the file is comprehensive.

---

## skeptic question: is `.play.integration.` redundant?

### convention semantics

| suffix | means |
|--------|-------|
| `.play.` | journey test (step-by-step user experience) |
| `.integration.` | test type (spawns processes, touches filesystem) |

### could we use just `.play.`?

no. the repo's test runner separates:
- `npm run test:unit` — `.test.ts` files
- `npm run test:integration` — `.integration.test.ts` files

without `.integration.`, this test would run with unit tests. but it spawns processes, which:
- slows unit test suite
- may have flaky behavior
- requires different setup

**verdict:** `.integration.` suffix is necessary, not redundant.

---

## skeptic question: is the convention documented?

### where should it be documented?

| location | purpose | documented? |
|----------|---------|-------------|
| repros | test convention | yes — "reproduction feasibility" section |
| brief | how to run tests | yes — `howto.run-tests.[lesson].md` |
| code | in-file | yes — jsdoc header |

### verification

**repros document (3.2.distill.repros.experience._.v1.i1.md):**
```
### test file

the journey tests should be in:
- `src/domain.roles/mechanic/skills/git.repo.test/git.repo.test.play.integration.test.ts`

this follows the `.play.integration.test.ts` convention
```

**test file header:**
```ts
/**
 * .what = journey tests for git.repo.test skill
 * .why  = verifies all test types, flags, and edge cases work correctly
 */
```

**verdict:** convention is documented in multiple places.

---

## why it holds

1. **location correct**: collocated with skill, matches repo convention
2. **single file sufficient**: 13 cases cover all journeys comprehensively
3. **suffix necessary**: `.integration.` required for test runner separation
4. **convention documented**: repros, brief, and code all document the pattern

the play test convention is followed correctly and documented.

**conclusion: has-play-test-convention = verified (tenth pass)**


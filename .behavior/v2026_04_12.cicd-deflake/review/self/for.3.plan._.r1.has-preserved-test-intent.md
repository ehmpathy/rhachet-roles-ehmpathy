# self-review: has-preserved-test-intent

## question

does the plan preserve test intent?

blockers:
- plan includes test skip
- plan includes accepted failure
- plan removes assertions without replacement

## methodology

1. opened 3.plan.yield.md
2. for each flake repair, verified:
   - no skip pattern proposed as the actual fix
   - no "accept failure" patterns
   - assertions remain untouched
3. traced repair impact on test behavior

## verification

### flake 1: brief.compress [case3] [t1]

**check: does repair include skip?**

- line 13-16 mentions skip as "alternative" but explicitly states: "this is NOT acceptable per the wish — skips are forbidden"
- the actual repair (line 18-20) is CI workflow keyrack unlock
- no skip in the actual repair path

✓ no skip

**check: does repair accept failure?**

- repair ensures credentials are available before test runs
- test still executes and must pass
- no "expect failure" or "retry on fail" patterns

✓ no accepted failure

**check: does repair remove assertions?**

- repair touches CI workflow, not test code assertions
- the test still calls `brief.compress --via bhrain/sitrep`
- the test still verifies the output

✓ assertions untouched

**test intent preserved:**

| before repair | after repair |
|---------------|--------------|
| test calls brain API for compression | test calls brain API for compression |
| test verifies output | test verifies output |
| flakes when keyrack not unlocked | keyrack always unlocked in CI |

the test behavior is identical. the only change is that credentials are reliably available.

### flake 2: git.release [row-25] watch with transitions

**check: does repair include skip?**

- repair (line 40-44) changes mockGh counter strategy
- no skip mentioned anywhere in flake 2 repair

✓ no skip

**check: does repair accept failure?**

- repair ensures mock state advances correctly per poll cycle
- test still expects specific state transitions
- no "accept timeout" or "retry" patterns

✓ no accepted failure

**check: does repair remove assertions?**

- repair touches mockGh.ts, not test assertions
- the test still verifies:
  - pr status transitions (open → merged)
  - CI check transitions (queued → completed)
  - watch loop terminates correctly

✓ assertions untouched

**test intent preserved:**

| before repair | after repair |
|---------------|--------------|
| test verifies watch loop tracks pr+ci transitions | test verifies watch loop tracks pr+ci transitions |
| mock returns sequenced responses | mock returns sequenced responses |
| flakes due to counter double-increment | counter advances correctly per poll cycle |

the test behavior is identical. the only change is that mock state advances correctly.

## why it holds

1. **neither repair proposes skip**: the plan explicitly calls out skip as unacceptable in flake 1, and doesn't mention it for flake 2
2. **neither repair accepts failure**: both repairs aim for deterministic success, not probabilistic acceptance
3. **neither repair touches assertions**: both repairs change infrastructure (CI workflow, mock implementation), not test code

the repairs fix *why* tests fail intermittently, not *what* tests verify.

## verdict

**no issues found** — both repair plans preserve test intent by repair of infrastructure reliability, not test behavior


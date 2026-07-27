# rule.require.clamp-edge-cases

## .what

every defect fix must **clamp** the edge case that produced it: add a regression test that
**fails before** the fix and **passes after**. the proof that your fix works and the clamp
that keeps it fixed are the same artifact — so always keep it.

this sharpens `rule.require.test-covered-repairs` with three demands:

1. treat the defect as an **edge-case class**, not a point event — clamp the class
2. the clamp costs no extra work — you must prove the fix anyway, so the proof IS the clamp
3. **prove the clamp bites** — it must go red under the un-fixed defect, green under the fix

## .why

a defect is never a one-off. it is one instance of an edge case the code mishandles — a
boundary, a stale ref, an empty input, a race, a re-stamped template. fix only the instance
and the class stays open: the same defect returns on the next refactor, upgrade, or merge,
and no one notices until it bites in prod.

you already build a reproduction to convince yourself the fix works. if you throw that repro
away, you paid the full cost of a clamp and kept none of the protection. keep it as a test
and the same effort buys permanent immunity to that edge case.

a clamp with no teeth is worse than absent: it reads as protection while it guards nothing.
a test that passes whether or not the defect is present proves only that it does not exercise
the defect. so the discipline is not "add a test" — it is "add a test that goes red when the
defect is present."

## .the rule

| when | you must |
|------|----------|
| any defect fix | add a test that fails before the fix, passes after |
| the fix lands | dogfood the clamp: revert the fix, watch it go red, restore, watch it go green |
| the defect was a boundary (stale ref, empty, off-by-one, race) | clamp the boundary, not just the one value that broke |
| the fix is un-observable in a unit (timing, drift, flake) | clamp at the grain that can observe it (integration, hermetic temp repo) |

## .prove the clamp bites

a clamp you have not seen fail is a guess. before you trust it:

1. land the fix, confirm the clamp is green
2. revert the fix (only the fix), rebuild, run the clamp — it MUST go red
3. restore the fix, rebuild, run the clamp — it MUST go green again

if step 2 stays green, the clamp does not exercise the defect. rewrite it until it bites.

## .examples

### 👍 good — a stale-ref scope defect, clamped and proven

a test-runner scoped "changed files" against local `main`, which drifts behind the real
trunk, so it dragged unrelated already-merged suites into scope.

- fix: compare against `origin/main` (the true fork point)
- clamp: a hermetic temp git repo where local `main` is deliberately left **behind**
  `origin/main` by one unrelated commit; assert the run matches only this branch's own
  change, NOT the behind-commit's file
- teeth: reverted the fix to `main` → clamp went red (matched 2, not 1). restored → green

the repro that proved the fix and the test that guards it are one file.

### 👎 bad — point fix, no clamp

```
fix(scope): compare against origin/main
```

the defect is gone today. no guard stops the next template re-stamp or refactor from
restoring `main`, and no test goes red when it does.

### 👎 bad — a clamp with no teeth

a test that provisions a repo where local `main` already equals the fork point. it passes
under both `main` and `origin/main`, so it never exercises the drift. it looks like a clamp
and guards no defect.

## .enforcement

- a defect fix with no regression clamp = **blocker**
- a clamp that passes under the un-fixed defect (no teeth) = **blocker**
- a fix for a boundary defect that clamps only the single value that broke, not the boundary
  class = **nitpick**

## .see also

- `rule.require.test-covered-repairs` — the base rule this sharpens (defect → regression test)
- `rule.require.failfast` — surface the defect loudly so the clamp has a clear signal to catch
- `rule.forbid.failhide` (code.test) — a clamp must verify on every path, never pass silently

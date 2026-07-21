# rule.require.fewer-paths-via-idempotency

## .what

when a code branch exists only to make an operation safe to run, do not take it as given. **first seek to make the operation itself idempotent and safe** — so the branch is never needed — then run it unconditionally. leverage idempotency to **collapse code paths** and shrink failure surface.

the mandate is active, not passive: you do not merely check "is it already idempotent and benign?" — you seek to *make* it so, because every domain.operation should already be idempotent (`rule.require.idempotent-procedures`). a branch kept only to skip benign idempotent redundancy is a code path that must be removed.

## .why

every conditional branch is a code path, and every code path is failure surface:

- it must be reasoned about, tested, and maintained
- its correctness may rest on subtle preconditions (time, order, state)
- a wrong branch silently drops or duplicates work

a branch that exists only to avoid "redundant" work on an idempotent operation is net-negative: it trades a benign redundancy for a real code path. make the operation idempotent, delete the branch, and the failure surface shrinks.

## .the principle

> do not branch around an unsafe operation — make the operation safe. every domain.operation should be idempotent, so the branch should be removable; if it is not, the operation is the defect.

## .the seek order

when you find a branch whose only job is to avoid redundant work, seek in this order:

1. **make the operation idempotent** — recast it as findsert / upsert / delete so a re-run converges to the same state (`rule.forbid.nonidempotent-mutations`)
2. **make the operation safe** — add an idempotency key, upsert on the natural key, or dedupe at the boundary, so an unconditional run cannot corrupt, double-charge, or drift
3. **only if neither is achievable** — keep the branch, and record why the operation resists idempotency

do not reach for step 3 first. a branch kept without an honest attempt at steps 1 and 2 is a defect papered over. when step 3 is truly forced, the operation — not the branch — is the debt to repay later.

## .examples

### 👎 negative — a branch that leans on a subtle proof

```ts
// a source task flips a triggered follow-on WAITING -> QUEUED, then completes.
// the branch avoids "re-queue" of an already-progressed trigger —
// but its correctness rests on a 300ms-race proof.
if (trigger.status === 'WAITING') {
  await setTaskAsQueued({ task: trigger }, context);
}
```

the branch adds a code path whose correctness must be proven against a race. that proof is failure surface.

### 👍 positive — make the target idempotent, then collapse the path

```ts
// setTaskAsQueued is recast as an idempotent upsert: re-drive of an
// already-done trigger just re-runs the idempotent upsert (or self-requeues).
// worst case = one redundant idempotent re-execution — benign.
await setTaskAsQueued({ task: trigger }, context);
```

the branch is gone because the operation was *made* safe. the code path and its proof burden go with it.

## .this is the architect-level design pressure

`rule.require.idempotent-procedures` (mechanic) makes retries *safe*. this rule *uses* that idempotency as design pressure: it demands you first shape the operation to be idempotent and safe, then collapse the code path. idempotency is not only a safety net — it is a license to delete branches, and a mandate to build operations that earn that license.

## .enforcement

- a branch kept to avoid redundant work, where the operation could have been made idempotent and safe but was not = **blocker** (fix the operation, then collapse the branch)
- collapse of a branch whose unconditional worst case is *not* benign, without first making the operation safe = **blocker** (the branch carried real weight)

## .see also

- `rule.require.idempotent-procedures` (mechanic) — the safety guarantee this leverages
- `rule.forbid.nonidempotent-mutations` (mechanic) — findsert/upsert/delete vocabulary this recasts toward
- `philosophy.domain-as-a-garden.[philosophy]` — idempotent, recomposable operations

# rule.require.idempotent-operations

## .what

design every domain.operation to be **idempotent** by default — a re-run with the same input converges to the same state, with no extra effect. idempotency is the contract, not the exception; a non-idempotent operation must justify itself.

this is the architect-scale twin of the mechanic's `rule.require.idempotent-procedures`. the mechanic rule guards the *implementation* (guard re-entry, upsert on retry). this rule guards the *contract*: the operation's shape, verb, and boundary must make idempotency the natural outcome, so every caller and composer can retry, resume, and recompose without fear.

## .why

idempotent operations are the atoms the garden composes (`philosophy.domain-as-a-garden`):

- **recomposable** — an idempotent operation can be dropped into any workflow; a re-run is safe, so composers need no bespoke guards
- **retry-safe** — at-least-once delivery, resumed workflows, and concurrent drives all converge instead of corrupt
- **fewer paths** — idempotency lets callers collapse guards (`rule.require.fewer-paths-via-idempotency`)
- **legible** — an idempotent contract states its own safety; the reader need not trace every call site to know a re-run is benign

a non-idempotent operation is a landmine in the garden: it composes once, then poisons every retry and every recomposition downstream.

## .how — shape the contract for idempotency

1. **name the verb for convergence** — findsert / upsert / delete (`rule.require.get-set-gen-verbs`, `rule.forbid.nonidempotent-mutations`); avoid create / insert / add, which duplicate on retry
2. **key on the natural identity** — upsert on the unique key so a re-run finds-or-updates instead of duplicates
3. **carry an idempotency key** where the boundary cannot dedupe on natural identity (external charges, emits)
4. **converge, do not append** — the operation drives toward a declared end state, not an incremental side effect

## .the caveat

some operations are intrinsically non-idempotent (an audit-log append, a monotonic counter, a one-time token mint). these are the exception, and each must:

- be named so the non-idempotency is explicit
- record why idempotency is not achievable
- be isolated so composers know the retry hazard

do not let the exception become the default. an operation that is non-idempotent by accident, not by declared intent, is a defect.

## .enforcement

- a domain.operation that is non-idempotent by accident (create/insert semantics where upsert would serve) = **blocker**
- a mutation verb that duplicates on retry, with no idempotency key or natural-key upsert = **blocker**
- an intrinsically non-idempotent operation with no recorded justification = **blocker**

## .see also

- `rule.require.idempotent-procedures` (mechanic) — the implementation-scale twin
- `rule.forbid.nonidempotent-mutations` (mechanic) — findsert/upsert/delete vocabulary
- `rule.require.fewer-paths-via-idempotency` — idempotency as license to delete guards
- `rule.require.get-set-gen-verbs` (mechanic) — the verbs that name convergence
- `philosophy.domain-as-a-garden.[philosophy]` — idempotent operations as recomposable atoms

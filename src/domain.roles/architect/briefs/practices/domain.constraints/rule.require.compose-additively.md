# rule.require.compose-additively

## .what

decompose so each invariant stays local to one part. each part trusts only the declared promise of the part below it. then test each seam: parts that each keep their promise do not prove the whole.

## .why

> "the number of cases between which we have to distinguish … combine additively, rather than multiplicatively" — dijkstra 1970, EWD 288 ✅

| decomposition | cases a reader must hold |
|---|---|
| each part keeps its invariant local; callers lean only on its promise | the sum of the parts' cases |
| parts reach into each other's internals, or lean on behavior never promised | the product of the parts' cases |

a sum stays reviewable as the system grows. a product does not: three parts with ten cases each is thirty to check, or a thousand.

## .how

1. **one home per invariant** — the part that owns the data owns the rule (`catalog.of=tactic.abstraction.kind=_.verb=set.tactic=gather`)
2. **small promises** — each part declares what it guarantees to callers, and no more (`define.constraint.kind=guarantee`, `catalog.of=tactic.abstraction.kind=contract.verb=set.tactic=narrow`)
3. **trust the promise, not the body** — a caller reasons from the declared contract; it never leans on how the part below happens to work today
4. **test each seam** — one test per seam proves the caller's assumption matches the callee's promise: the order, the units, the empty case, the error shape

## .why the seam test is owed

each part's own tests prove it keeps its promise. they cannot prove the caller read that promise the same way. take a seam defect: cents passed where dollars were promised, or an empty list where a null was expected. it passes every unit test and breaks the whole. the integration test at the seam is where an assumption meets the guarantee it rests on (`rule.require.assumptions-with-evidence`).

## .enforcement

a **seam** is a call across an owner or module boundary: an operation → its dao, one domain → another, a call through a contract. a call between two functions inside one part is no seam.

- a seam between two parts with no test that crosses it = **blocker**
- a caller that reads another part's internals (its storage, private fields, or dao around its operation) = **blocker** (`rule.forbid.multiplicative-composition`)
- a caller that leans on a callee's undeclared behavior = **nitpick**
- an invariant whose check is spread across parts, so a reader must hold several parts at once to verify it = **nitpick** (`rule.forbid.scattered-invariant-guards` is the blocker where writers each guard it)

## .see also

- `catalog.of=tactic.constraint.kind=_.grain=enforcement.tactic=compose` — the member, in full
- `rule.forbid.multiplicative-composition` — the forbid twin: the reach past a promise, with its cure
- `catalog.of=tactic.abstraction._` — the tactics that keep a part's promise small
- `rule.forbid.scattered-invariant-guards` — the blocker form, for many writers of one rule
- `philosophy.constraints-shrink-the-space` — comprehension as the first benefit of a smaller space
- `rule.require.test-coverage-by-grain` (mechanic) — integration tests at each seam

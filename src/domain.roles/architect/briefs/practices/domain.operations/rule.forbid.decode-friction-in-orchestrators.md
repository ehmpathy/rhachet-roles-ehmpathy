# rule.forbid.decode-friction-in-orchestrators

## .what

orchestrators must not contain logic that requires mental simulation to understand.

## .the test

"do i have to decode this to understand what it produces?"

- yes = extract to named transformer
- no = leave inline

## .practical heuristic

if the operation isn't named by us in this repo or from an ehmpathy package, wrap it in a domain-named transformer.

language primitives and third-party apis are optimized for generality, not domain clarity.

## .examples of decode-friction

| category | decode-friction | named operation |
|----------|----------------|-----------------|
| string parse | `slug.split('.')[0]!` | `asKeyrackKeyOrg({ slug })` (transformer) |
| date extract | `new Date(ts).toJSON().split('T')[0]` | `asIsoDate({ from: date })` (transformer) |
| aggregate | `items.reduce((s, i) => s + i.amount, 0)` | `computeTotal({ items })` (transformer) |
| pipeline | `.filter(...).map(...).sort()` | `getAllActiveUserEmails({ users })` (orchestrator) |
| boolean | `a && b \|\| c && !d` | `isEligibleForDiscount({ order })` (transformer) |
| raw api call | `await stripe.customers.create(...)` | `sdkStripe.setCustomer(...)` (communicator) |
| raw db query | `await db.query('SELECT ...')` | `daoCustomer.findByRef(...)` (communicator) |

## .note

this is not about specific categories (array access, regex, etc). complexity that requires decode can come from anywhere.

the examples are illustrative, not prescriptive. the rule applies to *any* logic that requires mental simulation.

## .enforcement

decode-friction in orchestrator = blocker

## .see also

- `define.domain-operation-grains` — transformers, communicators, orchestrators
- `rule.require.orchestrators-as-narrative` — what to achieve
- `philosophy.transformer-orchestrator-separation.[philosophy]` — the metaphors
- `rule.require.get-set-gen-verbs` — name patterns for leaf operations

# rule.forbid.decode-friction-in-orchestrators

## .what

orchestrators must not contain logic that requires mental simulation to understand.

## .the test

"do i have to decode this to understand what it produces?"

- yes = extract to named transform
- no = leave inline

## .practical heuristic

if the operation isn't named by us in this repo or from an ehmpathy package, wrap it in a domain-named transform.

language primitives and third-party apis are optimized for generality, not domain clarity.

## .examples of decode-friction

| category | decode-friction | named transform |
|----------|----------------|-----------------|
| string parse | `slug.split('.')[0]!` | `asKeyrackKeyOrg({ slug })` |
| date extract | `new Date(ts).toJSON().split('T')[0]` | `asIsoDate({ from: date })` |
| aggregate | `items.reduce((s, i) => s + i.amount, 0)` | `computeTotal({ items })` |
| pipeline | `.filter(...).map(...).sort()` | `getAllActiveUserEmails({ users })` |
| boolean | `a && b \|\| c && !d` | `isEligibleForDiscount({ order })` |

## .note

this is not about specific categories (array access, regex, etc). complexity that requires decode can come from anywhere.

the examples are illustrative, not prescriptive. the rule applies to *any* logic that requires mental simulation.

## .enforcement

decode-friction in orchestrator = blocker

## .see also

- `define.domain-operation-grains` — transforms vs orchestrators
- `rule.require.orchestrators-as-narrative` — what to achieve
- `philosophy.transform-orchestrator-separation.[philosophy]` — the metaphors
- `rule.require.get-set-gen-verbs` — name patterns for transforms

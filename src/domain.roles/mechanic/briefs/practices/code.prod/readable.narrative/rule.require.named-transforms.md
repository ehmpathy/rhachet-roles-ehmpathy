# rule.require.named-transforms

## .what

extract decode-friction logic into named transforms.

## .the heuristic

"do i have to decode this to understand what it produces?"

- yes → extract to named transform
- no → leave inline

## .practical heuristic

if the operation isn't named by us in this repo or from an ehmpathy package, wrap it in a domain-named transform.

language primitives and third-party apis are optimized for generality, not domain clarity. wrap them for readability.

## .examples

| before (decode-friction) | after (named transform) |
|-------------------------|------------------------|
| `slug.split('.')[0]!` | `asKeyrackKeyOrg({ slug })` |
| `items.reduce((s, i) => s + i.amount, 0)` | `computeTotal({ items })` |
| `users.filter(u => u.active).map(u => u.email)` | `getAllActiveUserEmails({ users })` |
| `a && b \|\| c && !d` | `isEligibleForDiscount({ order })` |

## .name patterns

defer to `rule.require.get-set-gen-verbs` for name conventions:

- `as*` — cast/parse (e.g., `asKeyrackKeyOrg`)
- `is*` — boolean check (e.g., `isEligibleForPremiumFeatures`)
- `get*` — retrieve/compute (e.g., `getAllActiveUserEmails`)
- `compute*` — deterministic calculation (e.g., `computeTotal`)

## .note

this is not about specific categories. any logic that requires mental simulation to understand belongs in a named transform.

## .enforcement

decode-friction inline in orchestrator = blocker

## .see also

- `rule.forbid.inline-decode-friction` — the forbid counterpart
- `rule.require.get-set-gen-verbs` — name patterns
- `define.domain-operation-grains` — transforms vs orchestrators (architect level)

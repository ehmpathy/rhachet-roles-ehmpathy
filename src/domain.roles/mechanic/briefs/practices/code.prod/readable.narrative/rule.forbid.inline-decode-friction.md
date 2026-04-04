# rule.forbid.inline-decode-friction

## .what

forbid decode-friction inline in orchestrators. all logic that requires mental simulation must be extracted to named transformers.

## .why

- orchestrators must read as narrative
- inline decode-friction forces readers to simulate implementation
- named transformers let readers grasp intent immediately
- readability pays dividends on every read

## .what is decode-friction

logic that requires you to mentally simulate what it produces:

- array access with positional semantics: `slug.split('.')[0]!`
- reduce/fold operations: `items.reduce((s, i) => s + i.amount, 0)`
- filter/map/sort pipelines: `.filter(...).map(...).sort()`
- complex boolean expressions: `a && b || c && !d`
- regex extractions: `str.match(/pattern/)[1]`
- date manipulations: `new Date(ts).toJSON().split('T')[0]`

## .what is NOT decode-friction

simple operations that are immediately clear:

- property access: `user.email`
- named function calls: `getActiveUsers({ users })`
- simple conditionals: `if (user.active)`
- standard library with clear names: `arr.length`, `str.trim()`

## .the test

"do i have to decode this to understand what it produces?"

- yes = extract to named transformer
- no = leave inline

## .enforcement

decode-friction inline in orchestrator = blocker

## .see also

- `rule.require.named-transformers` — the require counterpart
- `rule.require.narrative-flow` — overall narrative requirement
- `define.domain-operation-grains` — transformers, communicators, orchestrators (architect level)

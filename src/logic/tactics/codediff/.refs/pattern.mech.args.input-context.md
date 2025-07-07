### .tactic = args:input-context

#### .what
enforce function args to follow the pattern `(input, context?)`

#### .where
- applies to all function definitions (sync or async)
- required for exported/public-facing code
- demanded internally in modules as well for consistency

#### .why
- simplifies function call readability by favoring named argument shapes
- improves backwards compatibility when adding optional context
- encourages destructuring and clarity over ordered positional args
- aligns with domain pattern: input comes from upstream, context comes from environment

#### .how

##### .rules
- all functions must accept a single `input` argument
- optionally accept a second `context` argument
- both `input` and `context` must be destructurable objects
- positional arguments beyond `input` and `context` are not allowed
- inline callbacks may be exempted only if anonymous and tightly scoped

##### .examples

###### .positive
```ts
export const genRoute = async (input, context) => { ... }

const updateUser = ({ userId }, context) => { ... }

fetchResults(input)
```

###### .negative
```ts
export function doThing(a, b, c) {}           // ⛔ positional args

handleRequest(input, options, env)           // ⛔ more than two args
```

### .tactic = args:input-context

#### .what
enforce hard requirement that all procedure args to follow the canonical pattern: `(input, context?)` — even for simple one-liners

#### .why
- promotes long-term clarity and change-resilience over short-term brevity
- prevents positional argument confusion
- supports context injection without argument churn
- aligns with domain patterns: input = upstream data, context = runtime environment
- enables safe refactoring and consistent documentation across codebase

#### .where
- applies to **all function definitions** (sync or async)
- required for all exported and internal functions in production code
- expected in tests, hooks, utils, and logic modules
- only anonymous inline callbacks are **exempt** if tightly scoped

#### .how

##### ✅ required
- every function must accept exactly:
  - one `input` arg — a destructurable object
  - optional second `context` arg — also a destructurable object

- **hard requirement** — applies even to trivial utilities, pure transforms, and data extractors

- `input` does **not** need to be destructured at the function boundary; shape like `(input: { ... })` is fine
- `function` keyword is forbidden unless implementing class methods (see `.tactic:funcs:arrow-only`)

##### ❌ forbidden
- more than 2 positional args
- non-destructurable inputs
- context blended into input
- inline positional args unless anonymous


---

### .examples

##### ✅ positive
```ts
// standard function
export const genRoute = async (input: { slug: string }, context?: { traceId?: string }) => { ... }

// internal logic
const updateUser = ({ userId }: { userId: string }, context: { userDao: UserDao }) => { ... }

// test
expect(hasChanges({ before, after })).toBe(true);
```ts

##### ❌ negative
```ts
export function doThing(a, b, c) {}              // ⛔ positional args & function keyword

handleRequest(input, options, env)               // ⛔ more than two args

export const getTotal = (invoice) => ...         // ⛔ input not typed
```

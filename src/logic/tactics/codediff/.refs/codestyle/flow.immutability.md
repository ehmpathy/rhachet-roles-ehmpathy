.tactic = vars:require-immutable

.what = require all code to use immutable variables, objects, and update patterns — mutation is a blocker

.scope:
  - applies to all variable declarations, function arguments, object updates, and data flows
  - enforced in all modules, logic layers, stitched routes, and tests

.why:
  - eliminates side effects from shared mutable state
  - enables predictable execution, safer concurrency, and undoable flows
  - enforces functional purity and simplifies debugging
  - guarantees compatibility with clone-based and parallel architectures

.how:
  - all bindings must use `const`; `let` or `var` are **forbidden** unless explicitly scoped to a mutation block
  - input arguments must never be mutated — always treat as read-only
  - objects must never be mutated in place:
    - use object spreads (`{ ...original, field }`) or `.clone()` on domain objects
  - arrays must not be mutated directly:
    - never use `.push()`, `.pop()`, `.splice()`, or `.sort()` on the original array
    - use spread + map/filter/reduce or copy before mutating
  - use `withImmute()` and `.clone()` for all updates to domain objects
  - avoid shared reference mutation:
    - never change shared singletons or top-level config objects after import
  - if mutation is unavoidable (e.g. caching, metrics), isolate it in a clearly scoped, documented zone with `.note = deliberate mutation` comment

.enforcement:
  - `let`, `var`, and in-place mutation are blockers unless specifically exempted
  - mutation of input arguments or shared objects must fail review
  - mutation of domain object instances is forbidden; use `.clone()` instead
  - functions with mutation behavior must be annotated and justified

.examples:

  .positive:
    - `const updated = { ...original, status: 'complete' }`
    - `const newInvoice = invoice.clone({ total: 1200 })`
    - `const next = [...current].sort(byDate)`

  .negative:
    - `let count = 0; count++`
    - `input.customer.name = 'bob'` // ⛔ input mutation
    - `config.debug = false` // ⛔ shared singleton mutation
    - `arr.push(1)` // ⛔ in-place array mutation

.links:
  - see also: `arch:immutable-core`, `args:input-context`, `domain-objects.withImmute`

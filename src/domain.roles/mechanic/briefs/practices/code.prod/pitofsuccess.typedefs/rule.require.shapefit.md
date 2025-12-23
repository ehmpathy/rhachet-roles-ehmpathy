.tactic = types:shapefit

.what = types must be well-defined and naturally fit; mismatches signal legitimate defects to resolve

.scope:
  - applies to all type definitions, function signatures, and data transformations
  - enforced at compile time via typescript's type system

.why:
  - types that don't fit indicate a design flaw or incomplete understanding of the domain
  - forcing types to fit via casts hides bugs and creates runtime hazards
  - well-shaped types enable the compiler to catch errors before runtime
  - creates a pit-of-success where correct code is easier to write than incorrect code

.how:
  - if a type doesn't fit, investigate the root cause:
    - is the source data incorrectly shaped?
    - is the target type overly restrictive?
    - is there a missing transformation step?
  - resolve the mismatch by fixing the actual problem, not by casting
  - use discriminated unions and type guards for legitimate polymorphism
  - rely on typescript's inference rather than explicit annotations where possible

.enforcement:
  - type errors are blockers, not warnings to suppress
  - `as` casts are forbidden except at documented external boundaries (see rule.forbid.as-cast)
  - `any` types are forbidden except for truly dynamic scenarios with proper runtime validation

.examples:

  .positive:
    - refactoring a function signature to accept the actual input type
    - adding a missing property to a domain object
    - using `satisfies` to check conformance without casting
    - creating proper type guards for narrowing

  .negative:
    - `const x = y as SomeType` to silence compiler
    - `// @ts-ignore` to skip type checking
    - using `any` to bypass type constraints
    - loosening types to accommodate bad data

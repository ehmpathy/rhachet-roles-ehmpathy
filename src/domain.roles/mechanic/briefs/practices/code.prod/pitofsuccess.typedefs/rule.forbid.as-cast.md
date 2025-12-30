.tactic = types:forbid-as-cast

.what = use of `as X` casts is forbidden — it signals a rule.require.shapefit violation

.scope:
  - applies to all typescript code in the codebase
  - enforced at code review and lint rules

.why:
  - `as` casts bypass typescript's type system
  - they hide legitimate type errors that indicate design flaws
  - they create runtime hazards when the cast is incorrect
  - they make refactors dangerous as they silence compiler warnings

.exception:
  - allowed only at boundaries with external org code that lacks proper typedefs
  - must document via inline comment why this hazard is necessary
  - must include a note about what would need to change to remove the cast

.how:
  - when tempted to use `as`, ask: "why doesn't this type fit naturally?"
  - investigate and fix the root cause instead of casts
  - if the source types are wrong, create proper type definitions
  - if runtime validation is needed, use proper type guards
  - if the compiler is wrong about a type, file a typescript issue or use a narrower cast

.enforcement:
  - `as` casts in prod code without documented exception = BLOCKER
  - exception comments must explain:
    - why the external code lacks proper types
    - what the correct type should be
    - what would need to change to remove the cast

.examples:

  .positive:
    ```ts
    // refactored to avoid cast
    const result = processInput(input); // types align naturally

    // use type guard instead of cast
    if (isValidResponse(response)) {
      // response is properly narrowed here
    }

    // documented external boundary (allowed exception)
    // NOTE: third-party-sdk lacks proper types for this response
    // TODO: contribute types upstream or create local declaration file
    const data = response.data as ThirdPartyResponse;
    ```

  .negative:
    ```ts
    // ⛔ undocumented cast
    const user = data as User;

    // ⛔ cast to silence error
    const result = badFunction() as ExpectedType;

    // ⛔ any-cast escape hatch
    const x = (y as any) as SomeType;
    ```

.links:
  - see also: `rule.require.shapefit`

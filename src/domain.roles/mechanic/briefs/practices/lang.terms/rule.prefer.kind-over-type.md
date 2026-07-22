# rule.prefer.kind-over-type

## .what

for a domain-object attribute that selects a variant (a discriminator), prefer `kind` over `type`. avoid a field literally named `type`, or a `<noun>Type` name mirrored verbatim from an external api, when it selects a variant.

## .why

- `type` is overloaded: it collides with the TypeScript `type` keyword and the generic "data type" sense, so it reads ambiguously as a field name
- `kind` unambiguously names a discriminator / variant selector
- aws-native `*Type` names (`BudgetType`, `ActionType`, `ActionSubType`, `ThresholdType`, `NotificationType`) stutter on the domain object (`Budget.budgetType`) and drift from ubiqlang when mirrored verbatim

## .the rule

- **avoid**: a domain-object attribute literally named `type`, or `<noun>Type` when it selects a variant
- **prefer**: `kind` — one discriminator per object

## .the caveat — one `kind` per object

when an object holds more than one discriminator, only the **primary** is `kind`. a secondary discriminator earns its own domain term.

for example, spend `ACTUAL` vs `FORECASTED` becomes `basis`, not a second `kind`.

## .examples

### 👎 bad — overloaded / mirrored verbatim

```ts
interface Budget {
  budgetType: 'COST' | 'USAGE';   // stutters, mirrors aws BudgetType
}
interface Action {
  type: 'email' | 'sns';          // collides with `type` keyword + generic sense
  subType: 'immediate' | 'batch';
}
```

### 👍 good — kind for the primary discriminator

```ts
interface Budget {
  kind: 'COST' | 'USAGE';
}
interface Action {
  kind: 'email' | 'sns';
  cadence: 'immediate' | 'batch';  // secondary discriminator earns its own term
}
```

## .origin

surfaced in `declastruct-aws` feat-budget: `budgetType` / `actionType` / `subType` / `thresholdType` all became `kind` for clarity + peer symmetry.

## .enforcement

- a variant-discriminator attribute named `type` or verbatim `<noun>Type` = **nitpick** (prefer `kind`)

## .see also

- `rule.require.ubiqlang` — one canonical word per concept
- `rule.require.order.noun_adj` — name order
- `rule.forbid.gerunds` — peer lang.terms rule

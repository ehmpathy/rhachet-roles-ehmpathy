# rule.require.assure-via-type-checks

## .what

to assert a value's type, use a reusable `is$Noun` type-check and its `.assure` method (from `type-fns`) — never an ad-hoc `if (!isFoo(x)) throw` guard.

a `type.check` is a boolean type predicate — `(input: I): input is C`. wrapped with `withAssure`, it gains two methods:

- **`.assess`** — the boolean check (`input is C`), to narrow in an `if`
- **`.assure`** — the **assert**: throws if false, returns the value narrowed to `C` if true

> `.assure` *is* the assert. type-fns names the assert-variant `.assure` (not `.assert`) — a type-check that *assures* the type holds, or throws. when you reach for what other libraries call `assert`, reach for `.assure`.

use `.assure` (or the standalone `assure(value, isFoo)`) wherever you would otherwise write a throw-guard.

## .why

- **fail-fast in one expression** — `const uuid = isUuid.assure(input)` narrows *and* validates inline; no separate `if`/`throw` paragraph
- **fewer code paths** — the throw-branch is absorbed into the assure, so the happy path reads straight through (pairs with `rule.require.narrative-flow`)
- **reusable** — the `is$Noun` check is defined once and reused for both narrow (`.assess`) and assert (`.assure`)
- **rich errors** — `.assure` throws `AssureIsOfTypeRejectionError` (a `HelpfulError`), so failures are observable (pairs with `rule.require.failloud`)

## .how — define an `is$Noun` check with assure

```ts
import { withAssure } from 'type-fns';

// a branded domain type
type Uuid = string & { __brand: 'Uuid' };

// the type.check, wrapped so it carries .assess and .assure
export const isUuid = withAssure(
  (value: string): value is Uuid =>
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value),
  { name: 'isUuid' },
);
```

now the one check serves both jobs:

```ts
// narrow with .assess (boolean)
if (isUuid.assess(input)) { /* input is Uuid here */ }

// assert with .assure (throws + narrows)
const uuid: Uuid = isUuid.assure(input);
```

## .how — inline, without a pre-wrap

when you have a plain `is$Noun` check and want a one-off assertion, use the standalone `assure`:

```ts
import { assure } from 'type-fns';

const uuid: Uuid = assure(input.uuid, isUuid); // throws if invalid, narrows if valid
```

## .examples

### 👎 bad — ad-hoc throw-guard

```ts
const setSurferSkillLevel = (input: { surferId: string }) => {
  if (!isUuid(input.surferId)) {
    throw new Error('surferId is not a uuid');
  }
  const surferId = input.surferId as Uuid; // 👎 also an as-cast (rule.forbid.as-cast)
  // ...
};
```

### 👍 good — assure via the type-check

```ts
const setSurferSkillLevel = (input: { surferId: string }) => {
  const surferId = isUuid.assure(input.surferId); // narrows to Uuid, throws if not
  // ...
};
```

## .the names

- the check is `is$Noun` (`isUuid`, `isSurfer`, `isWaveReport`) — per `rule.require.get-set-gen-verbs` transformer prefixes
- assert reads as `is$Noun.assure(x)` — the check *assures* the type (this is the assert)
- narrow reads as `is$Noun.assess(x)` — the check *assesses* the boolean

## .enforcement

- an ad-hoc `if (!isFoo(x)) throw ...` type-assertion where a wrapped `isFoo.assure(x)` (or `assure(x, isFoo)`) applies = **blocker** (use the assure)
- a type-assertion that pairs a throw-guard with an `as`-cast to narrow = **blocker** (use `.assure`, which narrows without the cast — see `rule.forbid.as-cast`)
- a hand-rolled assert helper that duplicates `.assure` / `assure` = **blocker** (use type-fns)

## .see also

- `rule.forbid.as-cast` — `.assure` narrows without an `as`-cast
- `rule.require.shapefit` — types must fit; `.assure` validates the fit at runtime
- `rule.require.failfast` — assure is fail-fast in a single expression
- `rule.require.failloud` — `.assure` throws a `HelpfulError` subclass
- `rule.require.get-set-gen-verbs` — the `is*` transformer prefix
- type-fns readme — `withAssure`, `asAssure`, `assure`

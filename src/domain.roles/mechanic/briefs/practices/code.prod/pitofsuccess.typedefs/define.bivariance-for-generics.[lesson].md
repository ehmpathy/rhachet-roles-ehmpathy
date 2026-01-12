# method syntax for bivariance

## .what

typescript treats arrow function properties and method syntax differently for variance:

- **arrow function syntax** = contravariant on parameters
- **method syntax** = bivariant on parameters

```ts
// arrow function syntax (contravariant)
interface Dao {
  get: (input: SomeInput) => Promise<Result>;
}

// method syntax (bivariant)
interface Dao {
  get(input: SomeInput): Promise<Result>;
}
```

---

## .why this matters

when you check if a specific type is assignable to a generic type (e.g., `Dao<Specific>` to `Dao<any>`), contravariance on function parameters can cause unexpected failures.

### example: the problem

```ts
interface DeclastructDao<TResourceClass> {
  get: {
    // arrow syntax = contravariant
    byPrimary?: (input: RefByPrimary<TResourceClass>) => Promise<Resource | null>;
  };
}

// specific dao where RefByPrimary resolves to {uuid: string}
const specificDao: DeclastructDao<typeof MyResource> = { ... };

// generic dao shape where RefByPrimary<any> resolves to {}
type GenericDao = DeclastructDao<any>;

// 👎 fails: {uuid: string} is not assignable to {}
const generic: GenericDao = specificDao;
```

the contravariant check asks: "can a function that accepts `{uuid: string}` be used where a function that accepts `{}` is expected?"

answer: **no** — a function that requires `uuid` can't safely accept an empty object.

### example: the fix

```ts
interface DeclastructDao<TResourceClass> {
  get: {
    // method syntax = bivariant
    byPrimary?(input: RefByPrimary<TResourceClass>): Promise<Resource | null>;
  };
}

// 👍 works: bivariance allows assignment in either direction
const generic: GenericDao = specificDao;
```

---

## .when to use

use method syntax when:

1. you need interfaces with generic type parameters to be assignable to their `<any>` variants
2. you define dao/repository patterns where specific implementations must fit into generic collections
3. the interface will be used in `Record<string, Interface<any>>` shapes

---

## .tradeoff

bivariance is slightly less type-safe at the boundary — typescript won't catch certain mismatches. however, this is often the correct behavior for:

- generic collections of typed implementations
- plugin/provider patterns
- dao registries

the types remain fully enforced when you call the methods on a specific instance.

---

## .reference

this is intentional typescript behavior. method syntax preserves the historical bivariant behavior from before `--strictFunctionTypes` was introduced, because it matches how most developers expect object subtype to work.

- [typescript handbook: type compatibility](https://www.typescriptlang.org/docs/handbook/type-compatibility.html)
- [typescript pr: strict function types](https://github.com/microsoft/TypeScript/pull/18654)

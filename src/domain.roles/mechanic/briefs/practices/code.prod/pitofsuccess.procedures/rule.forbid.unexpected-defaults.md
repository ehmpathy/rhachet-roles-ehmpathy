# tldr

## severity: blocker

forbid unexpected defaults: silent fallbacks hide failures.

callers must know when data is absent vs when operation failed.

---
---
---

# deets

## .what

review for silent fallbacks that hide errors or absent data.

## .scope

applies to **production code**. test infrastructure has different constraints — see `ref.reviewer.test-infrastructure-context.md`.

**in scope:**
- domain.operations/, domain.objects/, contract/, access/

**out of scope:**
- *.test.ts, *.integration.test.ts, *.acceptance.test.ts

## .why

unexpected defaults:
- hide failures from callers
- make debug impossible
- cause cascade errors downstream
- corrupt data silently

## .how

for each operation, check:
- does this silently fall back to an unexpected value?
- are undefined/null cases handled with non-obvious defaults?
- would the caller expect this default behavior?

## .examples

### blocker — silently returns empty array on error

```ts
export const getUsers = async () => {
  try {
    return await fetchUsers();
  } catch {
    return []; // caller thinks no users exist!
  }
};
```

fix: throw or return result type that distinguishes empty from error

```ts
// option 1: throw
export const getUsers = async () => {
  return await fetchUsers(); // let error propagate
};

// option 2: result type
export const getUsers = async (): Promise<
  | { ok: true; users: User[] }
  | { ok: false; error: Error }
> => {
  try {
    return { ok: true, users: await fetchUsers() };
  } catch (error) {
    return { ok: false, error };
  }
};
```

### blocker — undefined becomes default value

```ts
export const getDiscount = (customer: Customer) => {
  return customer.discount ?? 0.1; // caller doesn't know if 10% is real or default
};
```

fix: make absence explicit

```ts
export const getDiscount = (customer: Customer) => {
  if (customer.discount === undefined) {
    throw new Error('customer has no discount configured');
  }
  return customer.discount;
};
```

## .note

this is closely related to failhide — see `rule.forbid.failhide.md`.

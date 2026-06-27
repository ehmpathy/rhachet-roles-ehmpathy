# tldr

## severity: blocker

forbid order-dependence: procedures must not assume prior calls occurred.

implicit setup/teardown requirements create fragile code that breaks when call order changes.

---
---
---

# deets

## .what

review for implicit dependencies on prior function calls.

## .scope

applies to **production code**. test infrastructure has different constraints — see `ref.reviewer.test-infrastructure-context.md`.

**in scope:**
- domain.operations/, domain.objects/, contract/, access/

**out of scope:**
- *.test.ts, *.integration.test.ts, *.acceptance.test.ts
- eval harnesses and test utilities (setup order is expected)

## .why

order-dependent code:
- breaks silently when refactored
- couples callers invisibly
- fails in unexpected ways in production
- requires tribal knowledge to maintain

## .how

for each operation, check:
- does this assume another function was called first?
- are there implicit setup/teardown requirements?
- would a reversed call order break behavior?

## .examples

### blocker — assumes init() was called

```ts
// throws if init() not called somewhere else
export const processOrder = async (order: Order) => {
  const config = getConfig(); // throws if init() not called
  // ...
};
```

fix: pass config explicitly

```ts
export const processOrder = async (
  input: { order: Order },
  context: { config: Config },
) => {
  // config explicitly provided
};
```

### blocker — assumes state was set

```ts
// assumes setUser() was called before
export const getUserEmail = () => {
  return currentUser.email; // currentUser may be undefined
};
```

fix: require explicit input or validate with clear error

```ts
export const getUserEmail = (input: { user: User }) => {
  return input.user.email;
};
```

## .note

for test infrastructure, setup order is expected and acceptable — `beforeAll` establishes preconditions.

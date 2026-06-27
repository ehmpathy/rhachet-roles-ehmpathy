# tldr

## severity: blocker

forbid hidden side effects: functions must only do what their name suggests.

mutations to inputs, global state, or external systems not obvious from the signature create invisible bugs.

---
---
---

# deets

## .what

review for side effects not obvious from function name or signature.

## .scope

applies to **production code**. test infrastructure has different constraints — see `ref.reviewer.test-infrastructure-context.md`.

**in scope:**
- domain.operations/, domain.objects/, contract/, access/

**out of scope:**
- *.test.ts, *.integration.test.ts, *.acceptance.test.ts
- eval harnesses (external state changes are expected)

## .why

hidden side effects:
- surprise callers who expect pure behavior
- create invisible dependencies between modules
- make code impossible to reason about
- break when refactored

## .how

for each operation, check:
- does the function do more than its name suggests?
- are there mutations to inputs or global state?
- are there writes to external systems not obvious from the signature?

## .examples

### blocker — name says "get" but it also writes

```ts
export const getOrCreateUser = async (email: string) => {
  let user = await findUser(email);
  if (!user) user = await createUser(email); // hidden write!
  return user;
};
```

fix: rename to `genUser` (findsert semantics) or split into explicit get/create

```ts
// option 1: name reflects behavior
export const genUser = async (input: { email: string }) => {
  const userFound = await findUser(input);
  if (userFound) return userFound;
  return await createUser(input);
};

// option 2: split operations
export const getUser = async (input: { email: string }) => { ... };
export const setUser = async (input: { email: string }) => { ... };
```

### blocker — mutates input

```ts
export const formatUser = (user: User) => {
  user.name = user.name.trim(); // mutates input!
  return user;
};
```

fix: return new object

```ts
export const formatUser = (input: { user: User }) => {
  return { ...input.user, name: input.user.name.trim() };
};
```

## .note

for test infrastructure, side effects to external systems are expected — tests verify integrations work.

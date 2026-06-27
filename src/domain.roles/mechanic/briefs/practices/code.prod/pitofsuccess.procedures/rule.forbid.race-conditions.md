# tldr

## severity: blocker

forbid race conditions: concurrent access to shared state must be protected.

read-modify-write sequences without mutex locks create data corruption and intermittent failures.

---
---
---

# deets

## .what

review for concurrent access patterns that create race conditions.

## .scope

applies to **production code**. test infrastructure has different constraints — see `ref.reviewer.test-infrastructure-context.md`.

**in scope:**
- domain.operations/, domain.objects/, contract/, access/

**out of scope:**
- *.test.ts, *.integration.test.ts, *.acceptance.test.ts
- eval harnesses and test utilities

## .why

race conditions are the hardest bugs:
- reproduce only under specific time/load conditions
- pass all tests, fail in production
- corrupt data silently
- impossible to debug without logs at the right moment

## .how

for each operation, check:
- does this write to shared state that others read concurrently?
- are there read-modify-write sequences without mutex locks?
- could two instances of this code run simultaneously?

## .examples

### blocker — read-modify-write without protection

```ts
// two concurrent calls can both read count=5, both write count=6
const count = await getCount();
await setCount(count + 1);
```

fix: use mutex lock wrapper

```ts
import { daoUser } from '@/access/daos/daoUser';

const _setUserCredits = async (input: { user: User; delta: number }) => {
  const credits = await daoUser.getCredits({ uuid: input.user.uuid });
  await daoUser.setCredits({ uuid: input.user.uuid, credits: credits + input.delta });
};

export const setUserCredits = withMutexLock(_setUserCredits, {
  on: (input) => input.user.uuid,
});
```

### blocker — check-then-act without lock

```ts
// two concurrent calls can both find no user, both create
const user = await findUser(email);
if (!user) {
  await createUser(email); // duplicate!
}
```

fix: use upsert or unique constraint

```ts
await upsertUser({ email }); // database handles race
```

## .note

if race conditions are truly unavoidable, document explicitly with rationale and mitigation strategy.

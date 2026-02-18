# How to Write BDD Style Tests

This guide explains the pattern to write integration tests via `test-fns` with `given`, `when`, `then`, and `useBeforeAll`.

## Core Pattern

```typescript
import { given, when, then, useBeforeAll } from 'test-fns';

describe('featureName', () => {
  // Shared setup for all tests in the describe block
  const dbConnection = useBeforeAll(() => getDatabaseConnection());
  afterAll(async () => dbConnection.end());

  given('[case1] description of the initial state', () => {
    // Setup specific to this case, shared across all when/then blocks
    const scene = useBeforeAll(async () => {
      // Create test data
      const entity = await createEntity({ dbConnection });
      return { entity };
    });

    when('[t0] action or event occurs', () => {
      then('expected outcome', async () => {
        // execute and verify via scene.entity
        const result = await performAction({ id: scene.entity.id });
        expect(result).toEqual(expectedValue);
      });
    });

    when('[t1] different action occurs', () => {
      then('different expected outcome', async () => {
        // another test via the same scene
        const result = await performOtherAction({ id: scene.entity.id });
        expect(result).toEqual(otherExpectedValue);
      });
    });
  });
});
```

## Key Principles

### 1. wrap all tests in `describe`

All tests for a feature should be wrapped in a single `describe` block:

```typescript
describe('syncPhoneFromWhodis', () => {
  // all given/when/then blocks go here
});
```

### 2. Use `useBeforeAll` for shared resources

Instead of `let` + `beforeAll` + `afterAll`:

e.g.,
```typescript
// 👎 Don't do this
let dbConnection: DatabaseConnection;
beforeAll(async () => {
  dbConnection = await getDatabaseConnection();
});
afterAll(async () => {
  await dbConnection.end();
});

// 👍 Do this
const dbConnection = useBeforeAll(() => getDatabaseConnection());
afterAll(async () => dbConnection.end());
```

### 3. Label given(scenes) with `[caseN]`

Each `given` block should have a unique case label:

```typescript
given('[case1] doer with outdated phone', () => { ... });
given('[case2] doer with matched phone', () => { ... });
given('[case3] doer does not exist', () => { ... });
```

### 4. Label when(event) with `[tN]`

Each `when` block should have an event time index label. The counter resets within each `given` block:

```typescript
given('[case1] first scenario', () => {
  when('[t0] command executed in PLAN mode', () => { ... });
  when('[t1] command executed in EXECUTE mode', () => { ... });
});

given('[case2] second scenario', () => {
  when('[t0] first action', () => { ... });  // counter resets to 0
  when('[t1] second action', () => { ... });
});
```

### 5. One Behavioral Assertion per `then` Block

Each `then` block should test a single behavioral assertion. This makes test failures more precise and test names more descriptive:

```typescript
// 👎 Don't do this - multiple assertions in one then
when('[t0] command executed in PLAN mode', () => {
  then('decision is UPDATE and doer remains unchanged', async () => {
    const result = await command({ mode: 'PLAN' });
    expect(result.decision).toEqual('UPDATE');
    expect(result.before.doer.contactPhoneNumber).toEqual('+13175550200');

    const doerAfter = await doerDao.findByUnique({ dbConnection, userUuid });
    expect(doerAfter?.contactPhoneNumber).toEqual('+13175550200');
  });
});

// 👍 Do this - separate then blocks for each behavioral assertion
when('[t0] command executed in PLAN mode', () => {
  then('decision is "UPDATE"', async () => {
    const result = await command({ mode: 'PLAN' });
    expect(result.decision).toEqual('UPDATE');
  });

  then('before.doer.contactPhoneNumber is "+13175550200"', async () => {
    const result = await command({ mode: 'PLAN' });
    expect(result.before.doer.contactPhoneNumber).toEqual('+13175550200');
  });

  then('doer contactPhoneNumber remains unchanged', async () => {
    await command({ mode: 'PLAN' });
    const doerAfter = await doerDao.findByUnique({ dbConnection, userUuid });
    expect(doerAfter?.contactPhoneNumber).toEqual('+13175550200');
  });
});
```

### 6. Use `scene` for Shared Test Data

When multiple `when/then` blocks need the same test data, use `useBeforeAll` to create a `scene`:

```typescript
given('[case1] description', () => {
  const scene = useBeforeAll(async () => {
    const doer = await createDoer({ dbConnection });
    const provider = await createProvider({ dbConnection, doerId: doer.id });
    return { doer, provider };
  });

  when('[t0] first test', () => {
    then('outcome', async () => {
      // Access scene.doer and scene.provider
      const result = await action({ doerId: scene.doer.id });
    });
  });

  when('[t1] second test', () => {
    then('outcome', async () => {
      // Same scene is reused
      const result = await otherAction({ providerId: scene.provider.id });
    });
  });
});
```

### 7. Cases Without Setup

If a case doesn't need setup (e.g., to test error handlers with invalid input), skip the `scene`:

```typescript
given('[case4] valid userUuid', () => {
  when('[t7] Whodis user cannot be found', () => {
    then('command throws error', async () => {
      await expect(
        command({ userUuid: '00000000-0000-0000-0000-000000000001' }),
      ).rejects.toThrow('Whodis user not found');
    });
  });
});
```

## Complete Example

```typescript
import { given, when, then, useBeforeAll } from 'test-fns';
import { getDatabaseConnection } from '../../utils/database/getDatabaseConnection';
import { myCommand } from './myCommand';

describe('myCommand', () => {
  const dbConnection = useBeforeAll(() => getDatabaseConnection());
  afterAll(async () => dbConnection.end());

  given('[case1] entity exists with state A', () => {
    const scene = useBeforeAll(async () => {
      const entity = await createEntity({
        dbConnection,
        state: 'A',
      });
      return { entity };
    });

    when('[t0] command executed in PLAN mode', () => {
      then('decision is "UPDATE"', async () => {
        const result = await myCommand({
          entityId: scene.entity.id,
          mode: 'PLAN',
        });
        expect(result.decision).toEqual('UPDATE');
      });

      then('entity state remains "A"', async () => {
        await myCommand({ entityId: scene.entity.id, mode: 'PLAN' });
        const entityAfter = await findEntity({ dbConnection, id: scene.entity.id });
        expect(entityAfter.state).toEqual('A');
      });
    });

    when('[t1] command executed in EXECUTE mode', () => {
      then('decision is "UPDATE"', async () => {
        const result = await myCommand({
          entityId: scene.entity.id,
          mode: 'EXECUTE',
        });
        expect(result.decision).toEqual('UPDATE');
      });

      then('after.state is "B"', async () => {
        const result = await myCommand({
          entityId: scene.entity.id,
          mode: 'EXECUTE',
        });
        expect(result.after.state).toEqual('B');
      });

      then('entity state is updated to "B"', async () => {
        await myCommand({ entityId: scene.entity.id, mode: 'EXECUTE' });
        const entityAfter = await findEntity({ dbConnection, id: scene.entity.id });
        expect(entityAfter.state).toEqual('B');
      });
    });
  });

  given('[case2] entity already in state B', () => {
    const scene = useBeforeAll(async () => {
      const entity = await createEntity({
        dbConnection,
        state: 'B',
      });
      return { entity };
    });

    when('[t0] command executed', () => {
      then('decision is "NOCHANGE"', async () => {
        const result = await myCommand({
          entityId: scene.entity.id,
          mode: 'EXECUTE',
        });
        expect(result.decision).toEqual('NOCHANGE');
      });
    });
  });

  given('[case3] invalid entityId', () => {
    when('[t0] command executed', () => {
      then('throws error', async () => {
        await expect(
          myCommand({ entityId: 'invalid-id', mode: 'PLAN' }),
        ).rejects.toThrow('Entity not found');
      });
    });
  });
});
```

## Benefits

1. **Readable test output**: Test names clearly show the scenario under test
2. **Efficient setup**: `useBeforeAll` runs once per `given` block, not per test
3. **Immutable references**: `const scene` and `const dbConnection` prevent accidental reassignment
4. **clear labels**: `[caseN]` and `[tN]` labels make it easy to identify and discuss specific tests
5. **Black-box tests**: Tests interact only through the contract layer, not internal implementations

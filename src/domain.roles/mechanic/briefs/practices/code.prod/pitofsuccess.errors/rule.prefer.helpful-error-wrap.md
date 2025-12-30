in some cases, its useful

to try/catch

to make an error more observable

---

e.g.,

```ts
try {
  // do task that throws
  await doSomething({ userUuid })
} catch (error) {
  if (!(error instanceof Error)) throw error;
  throw Error(`doSomething.error: ${error.message}, for userUuid=${userUuid}`, { cause });
}
```

in these cases, its best to use HelpfulError.wrap instead
- it automatically instantiates a HelpfulError (or more specific variant if specified) for maximum observability

e.g.,

```ts
import { HelpfulError } from 'helpful-errors';

await HelpfulError.wrap(
  async () => await doSomething({ userUuid }),
  {
    message: 'doSomething.error',
    metadata: {
      userUuid,
    }
  }
)()
```

or

```ts
import { UnexpectedCodePathError } from 'helpful-errors';

await UnexpectedCodePathError.wrap(
  async () => await doSomething({ userUuid }),
  {
    message: 'doSomething.error',
    metadata: {
      userUuid,
    }
  }
)()
```

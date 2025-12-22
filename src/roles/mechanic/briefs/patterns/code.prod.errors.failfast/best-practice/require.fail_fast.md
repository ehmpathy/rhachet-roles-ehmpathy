fail fast saves lives

when you fail fast, you detect fast, and you fix fast

this contributes to a pit of success
- enables tests to alert when unexpected behaviors occur, detected at build time
- enables logs to alert when unexpected behaviors occur, detected at monitor time
=>
- this allows us to more safely develop => as any surprises will be flagged asap, loud and proud
- this allows us to more rapidly maintain => as any changes live in production will be flagged asap, loud and proud

---

specifically, you should choose from

```ts
import { UnexpectedCodePathError } from 'helpful-errors';

throw new UnexpectedCodePathError(message, metadata)
```

or

```ts
import { BadRequestError } from 'helpful-errors';

throw new BadRequestError(message, metadata)
```

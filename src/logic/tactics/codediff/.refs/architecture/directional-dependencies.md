.tactic = arch:directional-deps

.what
enforce strict top-down dependency flow across layered system boundaries — lower layers must never import from higher ones

.scope
- applies to all folders and modules within `src/`
- required for `contract/`, `logic/`, `data/`, and `domain/` folders
- governs imports, module references, and stitched flow boundaries

.why
- upholds **separation of concerns** and enforces **clean architecture**
- prevents circular dependencies and tangled system boundaries
- makes each layer easier to test, replace, and understand in isolation
- aligns with `arch:bounded-contexts` and enables predictable top-down orchestration

.structure
```
src/
  contract/        // topmost — public interfaces, local commands
    endpoints/     // exposed APIs
    commands/      // internal entrypoints (e.g. CLI, scripts)
  logic/           // application procedures, stitched flows
  data/            // infrastructure layer (daos, sdks, services)
    daos/          // persistence logic — may reference domain objects
    sdks/          // external clients — may reference domain types
  domain/          // lowest — domain models, business rules
    objects/       // canonical domain declarations
```

.how
- each layer may depend **only on the layers below it**
  - `contract/` may depend on `logic/`, `data/`, `domain/`
  - `logic/` may depend on `data/`, `domain/`
  - `data/` may depend on `domain/`
  - `domain/` must not depend on anything outside its own layer
- stitched flows live in `logic/` or `contract/commands/` and orchestrate downstream only
- never import upward across layers (e.g. `domain/` importing `data/`)
- shared types must follow same directional rules

.enforcement
- imports that violate top-down boundary = BLOCKER
- circular dependencies between layers = BLOCKER
- logic in `domain/` must never reach into `data/`, `logic/`, or `contract/`
- logic in `data/` may use `domain/`, but must stay decoupled from business rules

.examples

✅ positive
```ts
// contract/endpoints/sendInvoice.ts
import { generateInvoice } from '@/logic/generateInvoice';

// logic/submitJob.ts
import { Job } from '@/domain/objects/Job';
import { jobDao } from '@/data/daos/jobDao';

// data/daos/jobDao.ts
import { Job } from '@/domain/objects/Job';
```

❌ negative
```ts
// domain/Customer.ts
import { customerDao } from '@/data/daos/customerDao'; // ⛔ illegal upward import

// domain/Invoice.ts
import { calculateTotal } from '@/logic/calculateTotal'; // ⛔ direction violation

// data/sdkWrapper.ts
import { dispatchFlow } from '@/logic/' // ⛔ bottom-up reference
```


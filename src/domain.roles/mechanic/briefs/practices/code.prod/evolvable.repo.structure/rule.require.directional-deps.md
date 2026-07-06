.tactic = arch:directional-deps

.what
enforce strict top-down dependency flow across layered system boundaries — lower layers must never import from higher ones

.the direction
```
contract  <-  domain.*  <-  access
```
- read right-to-left: `access` is the lowest layer, `domain.*` depends on it, `contract` depends on `domain.*`
- dependency flows downward only: `contract → domain.* → access`
- `utils/` and `infra/` are cross-layer — available to all layers, depend on none

.scope
- applies to all folders and modules within `src/`
- required for `contract/`, `domain.operations/`, `domain.objects/`, `access/`
- governs imports, module references, and stitched flow boundaries

.why
- upholds **separation of concerns** and enforces **clean architecture**
- prevents circular dependencies and tangled system boundaries
- makes each layer easier to test, replace, and understand in isolation
- aligns with `arch:bounded-contexts` and enables predictable top-down orchestration

.structure
```
src/
  contract/            // topmost — public interfaces, local commands
    api/               // public invocable api endpoints, deployed and exposed by the project; e.g., via `aws-lambda`
    cmd/               // private internal use entrypoints, supported by the project; e.g., via `as-command`
    sdk/               // public software development kit exports, supported by the project; e.g., `export ...`
    cli/               // public command line interface contracts, supported by the project; e.g., via `commander`

  domain.operations/   // domain behavior + business rules — depends on access/
  domain.objects/      // canonical domain declarations    — depends on access/svcs, access/sdks

  access/              // lowest layer — external + persistence contracts; domain depends on it, not the reverse
    svcs/              // remote first party contracts, from our own org — pure type contracts, referenced by uuid
    sdks/              // remote third party contracts, from any alt org — pure type contracts
    daos/              // private persistence logic — bridges db rows ↔ domain objects, so imports the domain object it persists

  utils/               // cross-layer utilities — available to all layers, depends on none
  infra/               // cross-layer infrastructure adapters — available to all layers, depends on none
```

.the consumption direction
`domain.objects/` and `domain.operations/` are the expected consumers of `access/`. access is the *lowest* layer: domain depends on it, never the reverse.

- `domain.operations/` MAY import from `access/` (daos, sdks, svcs)
- `domain.objects/` MAY import from `access/svcs` and `access/sdks` (e.g. an external service type contract referenced by uuid)
- `access/` MUST NOT import from `domain.operations/` or `contract/`

.the one caveat
`access/daos` is a persistence adapter: it bridges db rows ↔ domain objects, so a dao legitimately imports the domain object it persists (`jobDao` imports `Job`, `castFromDatabaseObject` builds a domain object).

this is the **only** upward import allowed anywhere: `access/daos → domain.objects`, and only `domain.objects` — never `domain.operations` or `contract`.

that single pair is the only reason `domain.objects → access/daos` must stay forbidden — it would close the one cycle (`domain.objects → daos → domain.objects`).

`access/svcs` and `access/sdks` hold pure type contracts with no dependency back on `domain.objects`, so domain that depends on them is never circular.

.how
- each layer may depend **only on the layer directly below it**
  - `contract/` may depend on `domain.operations/` and `domain.objects/` — never `access/` (reach access only through `domain.*`)
  - `domain.operations/` may depend on `domain.objects/`, `access/`, `utils/`, or `infra/`
  - `domain.objects/` may depend on `access/svcs`, `access/sdks`, `utils/`, or `infra/` — but never `access/daos` (circular)
  - `access/daos` may depend on `domain.objects/` as its only upward import (persistence adapter); `access/svcs` and `access/sdks` stay pure type contracts
  - `utils/` and `infra/` are available to every layer (daos, svcs, sdks, domain.*, contract all included); they must not depend on any module outside their own layer

- stitched flows live in `domain.operations/` or `contract/cmd/` and orchestrate downstream only
- shared types must follow the same directional rules

.the edges
| edge | verdict |
|------|---------|
| `domain.objects → access/svcs`, `access/sdks` | allowed (expected) |
| `domain.objects → access/daos` | blocker (would be circular) |
| `domain.operations → access/*` | allowed (expected) |
| `contract → access/*` | blocker (reach access only through `domain.*`) |
| `access/daos → domain.objects` | allowed (persistence adapter — the only upward import) |
| `access/daos → domain.operations`, `contract/` | blocker |
| `access/* → domain.operations`, `contract/` | blocker |
| `* → utils/`, `infra/` | allowed (cross-layer) |

.enforcement
- `domain.objects → access/daos` = **BLOCKER** (closes the one `domain.objects → daos → domain.objects` cycle)
- `contract/ → access/*` = **BLOCKER** (contract reaches access only through `domain.*`)
- `access/* → domain.operations/` or `access/* → contract/` = **BLOCKER** (bottom-up reference)
- `domain.operations/ → contract/` = **BLOCKER** (upward import)
- any import that violates top-down boundary = **BLOCKER**
- circular dependencies between layers = **BLOCKER**
- logic in `access/` must remain free of domain knowledge and business rules (it may import domain objects to persist them, but holds no business logic)
- logic in `utils/` and `infra/` must remain free of domain knowledge and business rules

.examples

👍 positive
```ts
// domain object references an external service type contract, by uuid
// domain.objects/claimSearchScope.ts
import { svcHomeServicesHomeService } from '@/access/svcs/svcHomeServices';

// domain operation uses a dao
// domain.operations/ingestClaims.ts
import { claimDao } from '@/access/daos/claimDao';

// dao persists the domain object it knows (only upward import allowed)
// access/daos/jobDao.ts
import { Job } from '@/domain.objects/Job';

// contract endpoint orchestrates via domain.* only (never reaches access directly)
// contract/endpoints/sendInvoice.ts
import { generateInvoice } from '@/domain.operations/generateInvoice';
import { Invoice } from '@/domain.objects/Invoice';
```

👎 negative
```ts
// domain object depends on persistence logic (would be circular)
// domain.objects/Customer.ts
import { customerDao } from '@/access/daos/customerDao'; // 👎 illegal: domain.objects → access/daos

// domain operation imports upward into contract
// domain.operations/InvoiceOps.ts
import { runFlow } from '@/contract/commands'; // 👎 direction violation

// contract reaches past domain.* directly into access
// contract/endpoints/sendInvoice.ts
import { invoiceDao } from '@/access/daos/invoiceDao'; // 👎 contract → access; reach access through domain.*

// dao reaches past domain.objects into domain.operations
// access/daos/jobDao.ts
import { generateInvoice } from '@/domain.operations/generateInvoice'; // 👎 daos may import domain.objects only

// access reaches upward into contract
// access/svcs/sdkWrapper.ts
import { dispatchFlow } from '@/contract/'; // 👎 bottom-up reference
```

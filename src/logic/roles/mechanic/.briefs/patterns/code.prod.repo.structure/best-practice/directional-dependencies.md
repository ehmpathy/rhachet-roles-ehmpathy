.tactic = arch:directional-deps

.what
enforce strict top-down dependency flow across layered system boundaries — lower layers must never import from higher ones

.scope
- applies to all folders and modules within `src/`
- required for `contract/`, `access/`, `domain.objects/`, `domain.operations/`
- governs imports, module references, and stitched flow boundaries

.why
- upholds **separation of concerns** and enforces **clean architecture**
- prevents circular dependencies and tangled system boundaries
- makes each layer easier to test, replace, and understand in isolation
- aligns with `arch:bounded-contexts` and enables predictable top-down orchestration

.structure
\`\`\`
src/
  contract/            // topmost — public interfaces, local commands
    endpoints/         // exposed APIs
    commands/          // internal entrypoints (e.g. CLI, scripts)

  access/              // infrastructure layer (daos, sdks, svcs)
    daos/              // persistence logic — may reference domain objects
    sdks/              // external clients — may reference domain types
    svcs/              // service wrappers — may reference domain types

  domain.objects/      // canonical domain declarations
  domain.operations/   // domain behavior + business rules

  infra/               // infrastructure specific adapters
\`\`\`

.how
- each layer may depend **only on the layers below it**
  - `contract/` may depend on `access/`, `domain.objects/`, `domain.operations/`
  - `access/` may depend on `domain.objects/`, `domain.operations/`
  - `domain.operations/` may depend on `domain.objects/`
  - `domain.objects/` must not depend on anything outside its own layer

- stitched flows live in `domain.operations/` or `contract/commands/` and orchestrate downstream only
- never import upward across layers (e.g., `domain.objects/` importing `access/`)
- shared types must follow the same directional rules

.enforcement
- imports that violate top-down boundary = **BLOCKER**
- circular dependencies between layers = **BLOCKER**
- logic in `domain.objects/` must never reach into `access/`, `contract/`, or `domain.oeprations/`
- logic in `domain.operations/` must not reference infrastructure concerns; they can can only leverage `infra/` adapters
- logic in `access/` may use domain layers but must remain free of domain knowledge and business rules
- logic in `infra/` must remain free of domain knowledge and business rules

.examples

✅ positive
\`\`\`ts
// contract/endpoints/sendInvoice.ts
import { generateInvoice } from '@/domain.operations/generateInvoice';
import { invoiceDao } from '@/access/daos/invoiceDao';

// access/daos/jobDao.ts
import { Job } from '@/domain.objects/Job';

// domain.operations/calculateTotal.ts
import { LineItem } from '@/domain.objects/LineItem';
\`\`\`

❌ negative
\`\`\`ts
// domain.objects/Customer.ts
import { customerDao } from '@/access/daos/customerDao'; // ⛔ illegal upward import

// domain.operations/InvoiceOps.ts
import { runFlow } from '@/contract/commands'; // ⛔ direction violation

// access/svcs/sdkWrapper.ts
import { dispatchFlow } from '@/contract/'; // ⛔ bottom-up reference
\`\`\`

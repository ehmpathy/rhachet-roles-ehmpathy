.tactic = name:treestruct

.what = enforce `[verb][...noun]` for mechanisms and `[...noun][status]?` for resources
.where:
  - `verb` = exactly one lead verb (e.g., `gen`, `set`, `get`, `map`)
  - `...noun` = hierarchy of nouns that reflects the domain treestruct
  - `status` = optional suffix that names a status or outcome (e.g., `Updated`, `Found`, `After`, `Draft`)
  - this tactic applies to all named functions, types, files, folders, and slugs

.why:
  - maximizes autocomplete groups by domain or action
  - enables tree-sorted navigation in IDEs and file explorers
  - avoids ambiguity and name drift across boundaries (design, dev, product)

.how:
  .rules:
    - For **mechanisms** (functions, generators, procedures):
      - use format: `[Verb][...NounHierarchy]`
      - the verb must come **first**, and be **exactly one** action (e.g., `gen`, `set`, `get`, `map`, `submit`)
      - e.g., `genStepImagineViaTemplate`, `setCustomerPhone`, `mapJobQuoteToEstimate`
    - For **resources** (stored data, outcomes, snapshots):
      - use format: `[...NounHierarchy][Status]?`
      - the optional `Status` suffix:
        - is used to disambiguate multiple forms (e.g., `InvoiceDraft` vs `InvoiceFinal`)
        - is typically a past participle or status label (e.g., `Found`, `After`, `Draft`)
        - may be omitted if the base noun already implies a single clear definition
      - e.g., `contentFound`, `customer`, `invoiceDraft`

  .examples:
    .positive:
      // mechanisms
      - `genStepImagineViaTemplate`   // generates a StitchStepImagine from a template
      - `setCustomerPhone`            // sets the customer's phone number
      - `mapGitRepoToWorkspace`       // maps a Git repo into a workspace domain
      - `getInvoiceFinalizedStatus`   // retrieves the final status of an invoice

      // resources
      - `contentFound`                // content retrieved from a source
      - `customer`                    // single canonical term for a user of services
      - `invoiceDraft`                // invoice in editable status
      - `invoice`                     // base noun with implicit sense

    .negative:
      - `stepImagineGenFromTemplate`  // 👎 wrong order — verb must come first
      - `customerSet`                 // 👎 vague mechanism — better as `setCustomer` or `setCustomerPhone`
      - `FoundContent`                // 👎 reversed word order and PascalCase — should be `contentFound`
      - `submitQuoteJob`              // 👎 noun hierarchy flipped — should be `submitJobQuote`
      - `update()`                    // 👎 unscoped verb — must include noun domain (e.g., `updateInvoice`)

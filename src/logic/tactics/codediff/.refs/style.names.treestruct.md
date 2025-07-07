.tactic = name:treestruct

.what = enforce `[verb][...noun]` for mechanisms and `[...noun][state]?` for resources
.where:
  - `verb` = exactly one leading verb (e.g., `gen`, `set`, `get`, `map`)
  - `...noun` = hierarchy of nouns reflecting the domain treestruct
  - `state` = optional suffix representing state or outcome (e.g., `Updated`, `Found`, `After`, `Draft`)
  - this tactic applies to all named functions, types, files, folders, and slugs

.why:
  - maximizes autocomplete grouping by domain or action
  - enables tree-sorted navigation in IDEs and file explorers
  - avoids ambiguity and naming drift across boundaries (design, dev, product)

.how:
  .rules:
    - For **mechanisms** (functions, generators, procedures):
      - use format: `[Verb][...NounHierarchy]`
      - the verb must come **first**, and be **exactly one** action (e.g., `gen`, `set`, `get`, `map`, `submit`)
      - e.g., `genStepImagineViaTemplate`, `setCustomerPhone`, `mapJobQuoteToEstimate`
    - For **resources** (stateful data, outcomes, snapshots):
      - use format: `[...NounHierarchy][State]?`
      - the optional `State` suffix:
        - is used when disambiguating multiple forms (e.g., `InvoiceDraft` vs `InvoiceFinal`)
        - is typically a past participle or state label (e.g., `Found`, `After`, `Draft`)
        - may be omitted if the base noun already implies a single clear meaning
      - e.g., `contentFound`, `customer`, `invoiceDraft`

  .examples:
    .positive:
      // mechanisms
      - `genStepImagineViaTemplate`   // generates a StitchStepImagine from a template
      - `setCustomerPhone`            // sets the customer's phone number
      - `mapGitRepoToWorkspace`       // maps a Git repo into a workspace domain
      - `getInvoiceFinalizedState`    // retrieves the final state of an invoice

      // resources
      - `contentFound`                // content retrieved from a source
      - `customer`                    // single canonical term for a user of services
      - `invoiceDraft`                // invoice in editable state
      - `invoice`                     // base noun with implicit meaning

    .negative:
      - `stepImagineGenFromTemplate`  // ⛔ wrong order — verb must come first
      - `customerSet`                 // ⛔ vague mechanism — better as `setCustomer` or `setCustomerPhone`
      - `FoundContent`                // ⛔ reversed word order and PascalCase — should be `contentFound`
      - `submitQuoteJob`              // ⛔ noun hierarchy flipped — should be `submitJobQuote`
      - `update()`                    // ⛔ unscoped verb — must include noun domain (e.g., `updateInvoice`)

.tactic = words:lowercase

.what = enforce lowercase for all words unless capitalization is required by code or naming convention
.where:
  - applies to comments, docstrings, markdown, logs, and prompt copy
  - only exceptions are code constructs (e.g., class names) and proper nouns (e.g., OpenAI)

.why:
  - keeps language neutral, minimal, and machine-aligned
  - prevents inconsistent or performative emphasis via caps
  - improves scanability and reduces visual noise across surfaces

.how:
  .rules:
    - do not capitalize the first word of a sentence
    - only use capitalization when:
      - referencing a class, type, or constant (e.g., `StitchStepImagine`, `GitRepo`)
      - writing a proper noun or brand (e.g., OpenAI, GitHub, AWS)
    - never capitalize:
      - generic nouns (`customer`, `invoice`, `step`)
      - verbs (`set`, `get`, `submit`, `handle`)
      - system comments or instructions, even at the beginning of a line

  .examples:
    .positive:
      - `// returns a new invoice if customer exists`
      - `// handled in gitrepo.init()`
      - `// fallback if no customer was found`
      - `// pass into StitchStepImagine to generate`
      - `// openai prompt requires flattened string`
    .negative:
      - `// Returns a new invoice`       // ⛔ capitalized sentence start
      - `// This is handled in GitRepo`  // ⛔ capitalized sentence + verb
      - `// Submit the job for approval` // ⛔ capitalized imperative
      - `// Customer must exist first`   // ⛔ capitalized domain noun
      - `// GitHub Repository`           // ⛔ capitalized generic noun

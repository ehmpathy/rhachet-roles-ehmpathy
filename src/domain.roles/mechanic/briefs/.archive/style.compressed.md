// style:tactics (compressed)

- name:ubiqlang
  - use one canonical term per concept (e.g., always use `customer`, never `client`, `user`, or `account`)
  - eliminate overloads: each term must refer to exactly one thing (e.g., do not use `update` for both "save" and "fetch")
  - when introducing a new term:
    - define its interface and role
    - document its meaning clearly
    - ensure consistent usage across code, docs, and tests

- name:treestruct
  - for mechanisms (procedures, steps, transforms), use `[Verb][NounHierarchy]` format
    - verb must come first and be atomic (e.g., `gen`, `set`, `get`, `map`, `submit`)
    - examples: `genStepImagineViaTemplate`, `setCustomerPhone`
  - for resources (records, results), use `[NounHierarchy][State]?` format
    - `State` is optional and should clarify the form or phase (e.g., `Found`, `Updated`, `Draft`, `Final`)
    - examples: `contentFound`, `invoiceDraft`, `customer`
  - group nouns by domain to maintain treesorted file and symbol organization

- words:lowercase
  - use lowercase for all non-code text (comments, prompts, markdown, logs)
  - never capitalize:
    - the start of a sentence
    - generic nouns (`customer`, `step`)
    - verbs (`set`, `submit`, `handle`)
    - system messages or instructions
  - only capitalize:
    - code symbols (e.g., `StitchStepImagine`, `GitRepo`)
    - proper nouns or brand names (e.g., OpenAI, GitHub)

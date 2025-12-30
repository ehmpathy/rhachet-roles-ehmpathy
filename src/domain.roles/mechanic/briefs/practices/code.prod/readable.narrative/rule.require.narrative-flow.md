.tactic = flow:narrative

.what = structure all logic as flat, linear code paragraphs — never nested branches — to improve clarity and scanability

.scope:
  - applies to all procedural code: stitched logic, exports, and internal helpers
  - required for all conditional flows, validation paths, and stateful transformations

.why:
  - reduces visual complexity via elimination of indentation creep
  - aligns code with natural narrative flow: guard clauses → main path → fallback
  - makes logic easier to read, debug, test, and extend
  - allows each "paragraph" of logic to be summarized with a single comment

.how:
  - eliminate `if/else` and nested `if` blocks entirely
    - use early returns (`if (x) return`, `if (error) throw`) instead
    - prefer `return`, `throw`, or `continue` to flatten control flow
  - define and use **code paragraphs**:
    - a group of 1–5 lines that do one task together
    - each paragraph must be preceded by a `//` one-line title that explains **what** or **why**
    - paragraph titles act like section headers — they are not optional
  - paragraphs must be separated by a blank line
  - paragraph comments must **not** describe how the code works — only why this paragraph exists
  - deeply nested branches should be broken into separate procedures if needed

.enforcement:
  - `else` and nested `if` blocks are blockers and must be refactored
  - any multi-line logic block without a paragraph title is a violation
  - paragraph comments must be one-liners — multiline `//` is forbidden (see `comment-discipline`)
  - code that reads like a decision tree must be flattened into a readable narrative

.definitions:
  - **code paragraph** = a contiguous block of related lines, preceded by a single-line `//` title and separated by a blank line
    ```ts
    // validate input format
    const isValid = validateShape(input);
    if (!isValid) return failure();

    // attempt fallback resolution
    const resolved = tryToResolve(input);
    if (!resolved) UnexpectedCodePathError.throw('resolution failed');
    ```

.examples:

  .positive:
    ```ts
    // return early if invalid
    if (!input.email) return failure();

    // check for banned domains
    if (input.email.endsWith('@spam.com')) return forbidden();

    // process verified email
    const result = handleVerifiedEmail(input.email);
    ```

  .negative:
    ```ts
    if (!input.email) {
      return failure();
    } else {
      if (input.email.endsWith('@spam.com')) {
        return forbidden();
      } else {
        const result = handleVerifiedEmail(input.email);
        ...
      }
    }
    ```

.links:
  - see also: `comment-discipline`, `funcs:shape-and-signal`, `flow:guard-first`

- ### **args:input-context**
  - **rule**: all procedures must follow the signature `(input, context?)`
  - **input** and **context** must be destructurable objects
  - positional args beyond `(input, context)` are **forbidden**
  - inline callbacks may be exempt if anonymous + tightly scoped
  - **example:**
    ```ts
    export const doWork = async (input, context) => { ... }       // ✅
    export function legacyFunc(a, b) {}                           // ⛔
    ```

---

- ### **funcs:arrow-only**
  - **rule**: all procedures must be declared as arrow functions
  - `function` keyword is **disallowed**, even for exports
  - object methods are allowed only inside class or api contracts
  - always destructure `input` as first argument when applicable
  - **example:**
    ```ts
    const getName = ({ name }) => name;                          // ✅
    export function getName(name) { return name }                // ⛔
    ```

---

- ### **comment-discipline**
  - **procedure headers**: every named procedure must begin with a block comment:
    ```ts
    /**
     * .what = intent in 1 line
     * .why = purpose in ≤ 3 lines
     * .note = optional caveats (concise)
     */
    ```
    - missing `.what` or `.why` = **blocker**

  - **code paragraphs**: every group of related lines must begin with a one-line `//` summary
    - must explain *why*, not echo the code
    - **multiline `//` comments are forbidden**
    - if more than one line is needed → extract into a named procedure
    - comment must be preceded by a newline

  - **example:**
    ```ts
    /**
     * .what = proposes code by iterating until clean
     * .why = ensures reviewer only sees finalized artifacts
     */
    export const proposeCode = async ({ threads }) => {
      // run mechanic feedback loop
      const result = await runIterateCycle({ threads });

      // return artifact for downstream route
      return result.threads.artist.context.stash.art.inflight;
    };
    ```

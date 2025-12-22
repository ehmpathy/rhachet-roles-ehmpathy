.tactic = flow:fail-fast

.what = enforce fail-fast logic using early exits and HelpfulError subclasses to reject invalid state or input immediately

.scope:
  - required in all stitched logic, business procedures, and service flows
  - applies to guard checks, validations, and branching paths

.why:
  - improves readability by collapsing failure paths early
  - eliminates nested branches and lets core logic shine
  - increases safety by clearly documenting and halting on invalid input
  - makes bugs easier to debug with rich context using `helpful-errors`

.how:
  - use **early returns or throws** for all guard clauses
    - never use `if (...) else` or deep nesting to control flow
  - prefer `UnexpectedCodePathError.throw(...)` for internal invariant violations
    - these signal logic errors that “should never happen”
  - prefer `BadRequestError.throw(...)` for rejecting invalid input or user requests
    - these signal invalid calls, not system failures
  - use `.throw(...)` syntax for clean 1-liners inside nullish chains or short circuits
  - include **context objects** in all thrown errors to aid debugging
  - validate error behavior in tests using `getError(...)`

.code structure:
  - treat each guard block as a **code paragraph**
    - must be preceded by a comment summarizing *why* the guard exists
    - blank line after each guard before continuing main logic

  ```ts
  // reject if user does not exist
  if (!user) return BadRequestError.throw('user not found', { userUuid });

  // halt if state is invalid
  if (!input.customer.phone)
    UnexpectedCodePathError.throw('customer lacks phone, invalid state', { customer });

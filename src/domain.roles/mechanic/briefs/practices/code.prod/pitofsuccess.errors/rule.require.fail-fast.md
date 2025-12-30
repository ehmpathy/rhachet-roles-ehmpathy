.tactic = flow:fail-fast

.what = enforce fail-fast logic via early exits and HelpfulError subclasses to reject invalid state or input immediately

.scope:
  - required in all stitched logic, business procedures, and service flows
  - applies to guard checks, validations, and branch paths

.why:
  - improves readability via early collapse of failure paths
  - eliminates nested branches and lets core logic shine
  - increases safety via clear documentation and halt on invalid input
  - makes bugs easier to debug with rich context via `helpful-errors`

.how:
  - use **early returns or throws** for all guard clauses
    - never use `if (...) else` or deep nested blocks to control flow
  - prefer `UnexpectedCodePathError.throw(...)` for internal invariant violations
    - these signal logic errors that “should never happen”
  - prefer `BadRequestError.throw(...)` to reject invalid input or user requests
    - these signal invalid calls, not system failures
  - use `.throw(...)` syntax for clean 1-liners inside nullish chains or short circuits
  - include **context objects** in all thrown errors to aid debug
  - validate error behavior in tests via `getError(...)`

.code structure:
  - treat each guard block as a **code paragraph**
    - must be preceded by a comment that summarizes *why* the guard exists
    - blank line after each guard before main logic continues

  ```ts
  // reject if user does not exist
  if (!user) return BadRequestError.throw('user not found', { userUuid });

  // halt if state is invalid
  if (!input.customer.phone)
    UnexpectedCodePathError.throw('customer lacks phone, invalid state', { customer });

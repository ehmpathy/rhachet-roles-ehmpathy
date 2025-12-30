idempotency is a must

we must always assume that retries will occur
- user will forget if they ran it or not
- code will compose dependent flows that may need to repeat operations safely
- apps will face network errors and retry requests

idempotency means that the same request duplicated will succeed as if it only ran once

---

the main methods to do so are via

- findsert = find or insert
  - const before = dao.findByRef()
  - if (before && nonDiff) return before
  - if (before && hasDiff) BadRequestError.throw('can not findsert; entity already exists but with different attributes')
  - const after = dao.upsert()
  - return after

- upsert = update or insert
  - this is a standard operation often handled at the database layer
  - simply always overwrite, idempotently

---

why are these the two main modes?

because otherwise the only other option is to throw an error on duplicate requests

there are fundamentally no other ways to support idempotency
- if it doesn't exist, great -> insert
- if it does exist, decide -> update (upsert) or retain (findsert)

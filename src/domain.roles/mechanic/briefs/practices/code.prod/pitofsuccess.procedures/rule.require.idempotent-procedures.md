.tactic = proc:require-idempotency

.what = all procedures must be idempotent unless explicitly marked otherwise — to call the same logic twice must not cause double effects

.scope:
  - applies to all stitched procedures, exports, and service logic
  - especially required for write operations, upserts, queues, retries, and workflows

.why:
  - prevents duplicate side effects from retries, race conditions, or concurrent execution
  - enables safe reruns, resume-after-failure, and audit-friendly execution
  - makes all logic safer to test, stitch, compose, and scale

.how:
  - all procedures must **guard against re-entry**
    - check whether the action has already occurred before execute
    - e.g., `if (invoice.status === 'FINAL') return invoice;`
  - any **side-effect-produce operation** must:
    - check for a prior result (e.g. prior record, idempotency key, state flag)
    - return early if already complete
  - **external writes** (db, api, fs, queues) must be safe to call multiple times without duplication
    - use upserts, conflict-ignore inserts, or external idempotency tokens
  - **procedures that are not idempotent** must be marked:
    - include `.note = non-idempotent` in header comment
    - include a guard against accidental retries (e.g. check `context.traceId`)
  - stitched logic should not assume “exactly once” semantics — instead, enforce “at-least once, safely”

.enforcement:
  - procedures with `set`, `push`, `post`, or other side-effect verbs must show idempotency check
  - non-idempotent procedures must be annotated with a `.note`
  - workflows and retry logic must assume re-entry and prove safety
  - test cases must show repeat-call has no additional effect

.examples:

  .positive:
    ```ts
    // skip if already finalized
    if (invoice.status === 'FINAL') return invoice;

    // finalize invoice
    const updated = invoice.clone({ status: 'FINAL' });
    await saveInvoice(updated);
    return updated;
    ```

    ```ts
    // deduplicate outbound message
    const alreadySent = await Message.find({ idempotencyKey });
    if (alreadySent) return alreadySent;

    await sendMessage({ to, body });
    ```

  .negative:
    ```ts
    await sendEmail(input); // ⛔ no check for previous send
    ```

    ```ts
    const saved = await insertLog({ ... }) // ⛔ may insert duplicate on retry
    ```


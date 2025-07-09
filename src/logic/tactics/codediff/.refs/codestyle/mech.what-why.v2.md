
### .tactic = comment-discipline

#### .what
require jsdoc style `.what` and `.why` comments to prefix every named procedure
require oneliner summaries of .what and why comments to precede every code paragraph

#### .why
- improves readability for future travelers
- captures intent behind decisions, not just behavior
- speeds up audits, refactors, and onboarding
- reinforces consistent communication in code


### .comment discipline

comments are a hard requirement — they must follow precise structure and length:

✅ required
- /** .what, .why */ block above all named procedures
- // one-liner before every logical paragraph of code

❌ forbidden
- missing .what or .why above a procedure
- multiline // paragraph comments
- vague, redundant, or “code-shaped” comments

##### .procedure headers
every named function must begin with:

```ts
/**
 * .what = intent summary
 * .why = reason it exists or matters
 * .note = optional; caveats or special behavior
 */
const doThing = (input: {}, context) => { ... }
```

rules:
- both .what and .why are mandatory — missing either = BLOCKER
- .what must be 1line max, clear and scan-friendly
- .why must be 3lines max, clear and scan-friendly
- .note is optional but must be concise


##### .code paragraphs

every meaningful block of lines must start with a one-line summary:

```ts
// load invoice and raise on pastdue
const invoice = await getInvoiceById(invoiceId);
if (invoice.status === 'PASTDUE') UnexpectedCodePathError.throw(...)
```

rules:
- must summarize intent (why this block exists), not echo code
- strictly one line — if it needs more, extract into its own procedure
- comment must precede the code it describes and have a newline predecessor (think of it like a paragraph title)

## .examples

expected, positive examples
```ts
/**
 * .what = generates a proposal via mechanic-reviewer feedback loop
 * .why = ensures code reaches quality bar before review
 */
export const proposeCode = async ({ threads }) => {
  // gather mechanic feedback through iteration
  const result = await runIterateCycle({ threads });

  // expose artifact for downstream use
  return result.threads.artist.context.stash.art.inflight;
};
```


forbidden, negative examples
```ts
// missing .what/.why above export      ⛔ blocker
export const doStuff = () => { ... }

// vague comment                        ⛔ no intent
// run flow
const r = run();

// multiline paragraph comment          ⛔ must extract into procedure
// handle logic for retries because retries are complicated
// and they sometimes need to be skipped on failure
const result = retry(input);
```

## .where
- required across all prod code (logic, utils, exports)
- expected in tests for setup/assert blocks
- exempt only for tiny expressions or internal lambdas


### .tactic = funcs:what-why-comments

#### .what
require `.what` and `.why` comments to prefix every named procedure and code paragraph

#### .why
- improves readability for future travelers
- captures intent behind decisions, not just behavior
- speeds up audits, refactors, and onboard
- reinforces consistent communication in code

---

#### .how

##### .procedure headers

every named function must begin with a jsdoc block like:

```ts
/**
 * .what = summarize the intent of the procedure
 * .why = explain why it exists or why it matters
 * .note = optional; record special behaviors, edge cases, caveats
 */
```

- mandatory for all exported procedures => this is a BLOCKER
- required for helpers that aren’t self-evident
- optional for anonymous one-liners or trivial passthroughs


##### .paragraph summaries

every logical paragraph (group of lines) must be prefixed with a `//` comment that summarizes its purpose:

```ts
// load invoice from database, for status check later in flow
const invoice = await getInvoiceById(invoiceId);
```

- avoid to duplicate code — focus on *intent*
- explain why it matters, not just what it is
- group related lines under a shared summary
- important: compress into one line. if a paragraph summary is multiline, then the code paragraph is complex enough to need its own procedure and testsuite


#### .examples

##### ✅ positive

```ts
/**
 * .what = generates a proposal via iteration until a releasable version is judged
 * .why = ensures only clean code reaches the reviewer, via mechanic feedback loop
 */
export const proposeCode = async ({ threads }) => {
  // iterate to gather feedback and judgment on inflight code
  const result = await runIterateCycle({ threads });

  // expose artifact for downstream routes
  return result.threads.artist.context.stash.art.inflight;
};
```

##### ❌ negative

```ts
// run flow  ⛔ unclear
const r = await run();

return r.artifact; // ⛔ what is this? why return this?

// very long comment that describes why this block exists
// and what it does and why it's written in this particular way
// suggests the code below is too complex and should be split out
const result = someLogic(input);
const adjusted = adjustResult(result);
const validated = validate(adjusted);
const final = finalize(validated);
```

#### .where

- applies to all production code: modules, utilities, logic, and exports
- expected in test files for setup blocks and assertions
- exempt only for tiny, obviously self-contained expressions

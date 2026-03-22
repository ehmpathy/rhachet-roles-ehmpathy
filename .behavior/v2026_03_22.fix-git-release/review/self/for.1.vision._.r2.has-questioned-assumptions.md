# self-review: has-questioned-assumptions (r2)

## for: 1.vision

---

## review with fresh eyes

re-read the vision document line by line. here are my observations:

---

## assumption: the `🌊 release:` format is the right unified format

**what do we assume?**
that the `🌊 release: {title}` format from snapshots is the correct unified shape.

**evidence?**
the extant snapshots use this exact format. the wish states "the stdout emitted for each branch should be exactly the same (reusable domain operation to stdout the desired state)."

**what if the opposite were true?**
if each transport had different optimal output shapes, the wish would be wrong. but the wisher explicitly rejected this: "right now, there is not a consistent stdout... and yet, because they are all just release transports, they should."

**conclusion:** this assumption holds. the wisher explicitly wants unified output.

---

## assumption: `--into` is distinct enough from `--from`

**what do we assume?**
that users won't confuse `--from` and `--into` since both are prepositions of direction.

**evidence?**
`--from` = source, `--into` = destination. natural english semantics.

**what if the opposite were true?**
users might confuse them. but the error messages guide: `ConstraintError: can't merge main into main`.

**counterexamples?**
none found. the preposition pair is intuitive.

**conclusion:** assumption holds.

---

## assumption: "merged" is the terminal success state for PR transports

**what do we assume?**
that once a PR is merged, it's done — no further action needed for that transport.

**evidence?**
this matches GitHub semantics. merged PRs cannot be re-merged.

**what if the opposite were true?**
if merged PRs needed follow-up, we'd need a post-merged state. but they don't.

**conclusion:** assumption holds.

---

## assumption: tag workflow completion = success for release-tag transport

**what do we assume?**
that "workflow completed" is equivalent to "release-tag transport succeeded."

**evidence?**
tag workflows (publish.yml) publish to npm/etc. completion = publish success.

**what if the opposite were true?**
if workflows completed but publish failed, we'd need to check publish status separately. but workflow failure = publish failure in practice.

**conclusion:** assumption holds.

---

## assumption: the vision examples use placeholder times `Xs` correctly

**what do we assume?**
that `Xs in action, Xs watched` placeholders will be replaced with actual times in implementation.

**evidence?**
the vision states: "use relative times (`Xs in action, Xs watched`) which we control via mock time, replaced in snapshots."

**what if the opposite were true?**
if we forgot to implement time replacement, output would show literal `Xs`. test snapshots would catch this.

**conclusion:** assumption holds; test coverage will verify.

---

## no issues found

all assumptions in the vision document are:
1. explicitly required by the wish
2. aligned with GitHub semantics
3. covered by planned test assertions

no corrections needed.


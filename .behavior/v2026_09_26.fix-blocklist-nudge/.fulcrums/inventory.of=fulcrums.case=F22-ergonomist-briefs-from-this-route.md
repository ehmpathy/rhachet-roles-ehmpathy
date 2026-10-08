# F22 — the two treestruct briefs land in the ergonomist role from this route

- **fork:** keep the new `rule.forbid.treestruct-header-gap` and
  `rule.forbid.treestruct-indented-text-as-children` briefs in
  `src/domain.roles/ergonomist/briefs/cli/`, authored in this route, plus the refresh of the
  shared `any` brief `howto.permission-examples.[lesson].md`. the alternative is to move them out
  or route them through the ergonomist's own change.
- **taken:** keep. the wisher asked for exactly this, in their words: *"enbrief in the ergonomist to
  ensure there's no confusion and forbid a blank newline in a treestruct between header and trunk"*.
  the treestruct shape is an ergonomist concern, so the ergonomist tree is its correct home. this
  route is the change that discovered the defect. the `any` brief documents this hook's own render
  and must match it, or it teaches a shape the hook never emits (i006 r008 nitpick.1).
- **raised by:** `arch-smell-scopeleaks` i007 blocker.1 + nitpick.1 (`rule.forbid.scope-leaks`).
- **rework:** clean — a move of two files and one boot.yml line.
- **confidence:** 85% — the wisher named the home; the reviewer's only open question is ownership.
- **where:** `src/domain.roles/ergonomist/briefs/cli/`, `src/domain.roles/ergonomist/boot.yml`,
  `src/domain.roles/any/briefs/howto.permission-examples.[lesson].md`.
- **verdict:** —

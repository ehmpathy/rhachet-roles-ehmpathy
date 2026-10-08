# F13 — the `.agent/.actors/…` files in the diff

- **fork:** drop the staged `.agent/.actors/…` files (and the `.claude/settings.json` →
  `.agent/.actors/actor.via.slug=.default/brain/.claude/settings.json` rename) from this change,
  vs let them ride with it.
- **taken:** left as found, for the wisher to rule. this route did not author them: they were
  staged before the route began (the session's first `git status` lists them), by the rhachet
  actor setup that moves a repo's claude config under `.agent/.actors/`. this session's own
  brain config lives there, so a driver that unstages or deletes them edits the harness it runs
  in. none of the hook, test, brief, or inventory changes depend on them.
- **the ask:** keep them in this change (the actor migration lands with it), or split them into
  their own change first — `git restore --staged .agent/.actors .claude/settings.json` holds
  them back without a delete.
- **rework:** clean — an unstage.
- **confidence:** 70% — the right home for an actor migration is the wisher's call.
- **where:** `.agent/.actors/.gitignore`, `.agent/.actors/actor.via.slug=.default/brain/.claude/*`.
- **verdict:** ruled by the wisher (2026-09-27) — keep them in this change.

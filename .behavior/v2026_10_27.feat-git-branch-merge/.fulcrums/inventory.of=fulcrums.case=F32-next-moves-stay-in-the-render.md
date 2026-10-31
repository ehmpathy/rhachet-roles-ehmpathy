# F32 — catchup's next moves stay as `next` branches in the render, not coconut hints

- **fork**: peer `repo-rules` (5.3 i002) cites `rule.require.coconut-hints` against each `next:` / `fix:` leaf and the `🌊 ready to push` footer. (a) keep them as branches of the render; (b) recast each as a `🥥 did you know?` block
- **taken**: (a). the same rule's caveat forbids a coconut that carries information the render needs to be correct (a blocker): a hint is optional guidance. these moves are required: with a merge in flight, `continue` or `abort` is the only way out; a conflict stop names how to settle; the push line is the step the wish names after the commit. each is the render's own content, so it stays a branch. the `--mode apply` footer and the `rhx git.commit.uses` grants match `git.commit.set`, whose renders the catchup gates reuse
- **rework**: clean. a recast changes renders and snaps only; no caller parses them
- **risk**: low. the moves are named either way; only the frame differs
- **confidence**: 80%
- **where**: `git.branch.catchup.*.sh` renders; peer `repo-rules` i002 nitpick.1
- **verdict**: taken by the driver: an execution fork (seed S7)

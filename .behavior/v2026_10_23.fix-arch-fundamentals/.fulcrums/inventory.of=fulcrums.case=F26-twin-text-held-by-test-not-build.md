# F26 — the twin text is held equal by a test; build-time generation is deferred

- **the fork**: r11 (i005) nitpick.1: the `define.invariant` twins stay equal only by `briefs.twins.integration.test.ts`. (a) generate each role's copy from one canonical body at build; (b) keep two typed copies, held by the test, with each see-also shape-checked.
- **taken**: (b), and the cure caught as `dreams/v2026_11_24.feat.twin-briefs-generated-from-one-canonical-text.md`.
- **why**:
  - (a) adds a build step and a new source layout, and moves where an author edits a twin: a ripple past this route's diff (CLEAN: no)
  - the test discovers twins by marker, checks the mirror names back, checks the shared text, checks each see-also holds only citations (so a clause appended there fails red), and checks each citation is reachable from its role. a drift cannot ship green
  - one twin pair exists today; a build step for one pair is premature (`rule.prefer.wet-over-dry`)
- **rework**: clean — the test stays valid input to (a); (a) lands as its own change.
- **confidence**: 85%. the residual: a second twin may arrive before the dream does.
- **where**: `src/domain.roles/briefs.twins.integration.test.ts`; `5.1.execution.from_vision` review i005, r11 nitpick.1
- **verdict**: ruled by the wisher, 2026-11-27 — neither (a) nor (b): one file, owned by the architect; the mechanic ships a relative symlink to it. every citation in the shared text marks the role that ships it. `briefs.shared.integration.test.ts` replaces the twins test: each link is relative, resolves into another role's real file, and every citation opens from both roles. the build copies link content into dist (`rsync --copy-links`), so the package carries a real file

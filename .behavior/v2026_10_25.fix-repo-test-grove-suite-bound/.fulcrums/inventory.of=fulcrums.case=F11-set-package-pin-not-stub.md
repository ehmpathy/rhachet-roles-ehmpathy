# F11 — set.package success case: an owned pin, not a stubbed audit

- **fork:** stub or mock the registry audit so the case is hermetic · or keep the real audit and
  pin a package whose advisories this org controls
- **taken:** the owned pin. `set.package.install.integration.test.ts` is an integration test;
  `rule.forbid.integration.mocks` forbids a mock of the boundary it exists to prove, and a
  stubbed audit would verify only the stub. the pin moved from `zod@3.22.4` (a third party's
  package, which gained an advisory) to `type-fns@1.21.0`, whose repo is `ehmpathy/type-fns` and
  whose one dependency is `helpful-errors`, also ehmpathy's (`npm view type-fns@1.21.0`)
- **the cause addressed:** the case broke because a third party published an advisory against a
  pin we chose. the cause is who controls that pin's advisories, not that the audit is real. an
  owned pin moves control in-house: an advisory there is one this org files and fixes
- **scope:** the pin swap rode this branch because it turned ci red on every push; it is one
  line and one comment, with intent ("install succeeds, output shows success") unchanged. the
  advisory path itself is the skill's, and stays covered by its own cases
- **rework:** clean — a different pin, or a local registry fixture, if the council prefers
- **confidence:** 85%
- **raised by:** peer i001 — arch-opport-decomposition blocker.1, arch-smell-scopeleaks
  blocker.1, arch-hazards-maintenance blocker.1, ergo-friction-hazards blocker.4,
  arch-hazards-behavior nitpick.4, behavior-intent-coverage nitpick.1
- **verdict:** —

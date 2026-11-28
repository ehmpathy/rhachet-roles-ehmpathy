# rule.forbid.twin-tool-sprawl

## .what

when a paved tool fails you, fix that tool. never pave a twin beside it under a new name.

a **twin** is a second skill that does the paved tool's job by another path: `test.acceptance.prebuilt`
beside `git.repo.test --what acceptance`, `deploy.fast` beside `deploy`, `release.manual` beside
`git.release`. each name reads as a synonym of the paved one, and none says which to reach for.

## .why

- **the defect stays.** the twin routes around the failure; the paved tool still fails for the next
  traveler who reaches for it, and they cannot tell the twin exists
- **synonyms sprawl.** two tools for one job is one concept with two words (`rule.require.ubiqlang`).
  a reader must learn both, and guess which one is current
- **the twin rots.** it serves the one case that birthed it; nobody tests it against the next, and it
  outlives the defect it routed around

## .the cure

1. **diagnose the root** — why did the paved tool fail? (`rule.require.solve-at-cause`, architect)
2. **fix it there** — a flag, a gate, a repair inside the paved tool, with a clamp that fails before
   the fix and passes after (`rule.require.clamp-edge-cases`)
3. **the cause sits in another repo** — dispatch it upstream (`rhx radio.task.push --into <repo>`);
   never pave a local twin
4. **a twin already exists** — retire it once the root is fixed

## .the test

> **does a paved tool already own this job?**

yes → fix that tool. no → pave a new one, named for its own job.

## .example

`npm run test:acceptance` rebuilds first, and its last build step refused once. a twin skill,
`test.acceptance.prebuilt`, was paved to run jest on a prior `dist/`. the refusal was the defect; the
twin hid it. the cure: let the build pass, run acceptance through `git.repo.test`, retire the twin.

## .enforcement

- a new skill that duplicates a paved tool's job under another name = **blocker**
- a twin kept after its root defect is fixed = **blocker**
- a workaround skill with no upstream task or root fix named = **blocker**

## .see also

- `rule.require.ubiqlang` — one word per concept, so one tool per job
- `rule.require.clamp-edge-cases` — the clamp a root fix owes
- `rule.require.solve-at-cause` (architect) — diagnose before you build

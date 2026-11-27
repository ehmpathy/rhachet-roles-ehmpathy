# F10 — the suite installs real registry packages

## .the fork

a reviewer (arch-hazards-behavior, i001 nitpick.4) flagged that the fixtures depend on registry
latency.

- **A** — a local fixture registry, or a mocked pnpm
- **B** — real `pnpm install` of real registry packages, with a generous bound and a loud failure

## .taken: B, and why at the time

the verb's contract is real pnpm on a real install; `rule.forbid.integration.mocks` forbids a mocked
pnpm, and a local registry is a large fixture for a nano wish. each spawn has a 180s bound, and a
failure throws `MalfunctionError` with the spawn error and a hint, so a slow or absent registry names
itself. ci on pr #1020 ran the suite green.

## .rework: clean

a local registry would replace `genPnpmRepo` alone; no case changes.

## .confidence: 80%, and why it is low

the suite now runs ~9 min locally; a slow ci day could press the bound.

## .where

- `git.package.patch.integration.test.ts` — `genPnpmRepo`, `genPnpmToolsBinDir`

## .verdict

open

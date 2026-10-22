# F33 — the compress fix is clamped below the cli, with no paid acceptance run

## .the fork

this pr makes `compressViaBhrain` re-ask on a degenerate sitrep. 5.3 r4
(ergo-acceptance-journey-coverage, librarian blocker.1) asks for an acceptance test that runs the
`compress.via.bhrain.ts` cli and snaps its output, success and degenerate paths.

- **A (taken)** — three layers below the cli: `getOneSitrepViaAsks` unit-tested with a fake ask
  (degenerate twice then whole, a throw then whole, every ask degenerate, zero attempts); one real
  brain call through `compressViaBhrain` that asserts a non-degenerate sitrep; a masked snapshot of
  the result shape (`<string>` / `<number>` per field)
- **B** — an acceptance test that runs the cli, with a paid brain call per ci run

## .taken, and why

A. the cli shell (`main`: args → json) is byte-identical in this diff; the change sits in
`compressViaBhrain`, which A exercises live. the degenerate path cannot be forced on a live brain —
it is probabilistic — so only the fake-ask unit proves it, at any layer. B adds a paid call per ci
run on a surface this pr did not touch (the same cost F29 weighs for the extant llm suites).

## .rework

clean — one acceptance file, if the council asks for it.

## .confidence

70% — the reviewer reads the cli as the contract; the shell is unchanged, but the result it prints is
the one this pr changed.

## .where

`src/domain.roles/librarian/skills/brief.compress/compress.via.bhrain.real.integration.test.ts`,
`src/domain.operations/sitrep/getOneSitrepViaAsks.test.ts`

## .verdict

open — for the fulcrum council.

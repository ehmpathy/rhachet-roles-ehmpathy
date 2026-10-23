# F40 — the brain's lack-of-creds case is owned by the keyrack, not driven here

## .the fork

5.3 i002 r3 (external-contracts) librarian nitpick.1: the real brain test
(`compress.via.bhrain.real.integration.test.ts`) drives the happy path only; the rule names a
lack-of-creds case too.

- **A (taken)** — no lack-of-creds case in this suite; the keyrack owns that path
- **B** — drive an absent key from this suite

## .taken, and why

A. B was tried and measured on 2026-10-22: with `HOME` swapped to an empty dir in-process, the
call still succeeded — the unlocked keyrack daemon serves the key from outside `HOME`, so no
in-process knob makes the key truly absent. a real absent key would mean a lock of the shared
test keyrack mid-suite, which breaks every parallel suite that reads it.

the path is still loud by construction: rhachet's `getSdkCredsFromBrainSupplies` reads keyrack
creds with "no env fallback" and throws `ConstraintError` on an absent key; this skill's `main()`
turns any throw into exit 1 with the message on stderr (`compress.via.bhrain.ts`, the
`require.main` catch). there is no branch that returns a sitrep without creds.

## .rework

clean — one case, once a keyrack seam exists to point a call at an empty keyrack.

## .confidence

70%.

## .where

`src/domain.roles/librarian/skills/brief.compress/compress.via.bhrain.real.integration.test.ts`.

## .verdict

open — for the fulcrum council.

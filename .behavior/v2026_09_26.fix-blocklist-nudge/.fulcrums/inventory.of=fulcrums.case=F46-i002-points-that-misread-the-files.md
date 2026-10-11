# F46 — four 5.3 i002 points misread the files they cite

## .the fork

- **change the code to quiet each point**
- **hold, with the file as evidence** — each point's claim is false against the current file

## .taken — hold, and why at the time

| point | claim | the file says |
|---|---|---|
| r7 `mech-given-when-then` blocker.1 | `boot.yml.integration.test.ts` still uses `it()` | zero `it(` and zero `describe.skip` (grepsafe `\bit\(\|describe\.skip` → 0 matches). the reviewer's own snippet shows `given('[case1] …')` / `when('[t0] …')`, and its prose hedges: it asks to check the file for any `it(...)` left |
| r3 `mech-external-contracts` nitpick.1 | the yield's jq acceptance cell points at `case8` | yield row: "acceptance case6 (jq), case8 (sed)". acceptance `[case6][t0]` runs `jq .scripts package.json`; `[case8]` is the sed read. the cell is right |
| r6 `ergo-snapshot-visual-blemishes` nitpick.2 | the `permissions.get --help` render opens flush, no frame | the snapshot the point quotes opens `"` then an empty line, then `🐚 permissions.get …` — the same blank-line frame as the nudges render |
| r6 `ergo-snapshot-visual-blemishes` nitpick.1 | `permissionrequest.decide-permissions` renders drop the `jq:` prefix | `<JQ_CAUSE>` is a test-side mask of a jq-version-volatile cause, not the render; each suite masks its own volatile text. the shipped render names jq's own message. the decider predates this route (F36) |

## .rework

**clean** — none of the four asks for a change the code lacks.

## .confidence — 90%

## .where

`5.3.verification` i002 givens r003, r006, r007.

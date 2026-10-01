# F18 — does acceptance 7 bind the pipeable mode, or is the unix empty-zero the contract?

- **rework**: clean (code — one stderr line behind a mode test) · dirty (round)
- **status**: ✅ ruled 2026-09-23 — it does not bind. my call confirmed
- **confidence**: 74% → ruled
- **raised**: by `r008` and `r011` independently. `r011`: *"This one isn't mechanical — it's a
  scope/design call... Recommend a fulcrum, not a blind fix."*
- **where**: `grepsafe.sh` — the pipeable arm (`--output direct` when raised; renamed at F23)

## .the fact

acceptance 7: *"a caller can tell WHICH KIND of zero they got, from the answer alone."* under the
pipeable mode a zero is empty stdout, exit 0:

| kind | reads apart? |
|------|--------------|
| the search could not run | yes — stderr plus exit 2, or the `unread` block |
| no file matched the glob | no — empty stdout, exit 0, empty stderr |
| no line matched the pattern | no — identical |

## .the fork

| surface the kind on stderr | leave the mode as it stands |
|---|---|
| acceptance 7 carves out no mode | stdout is data; the caller opted into that |
| stderr is already this mode's diagnostic channel | stderr carries anomalies only; a clean zero is not one |
| a typo'd glob reads as "no matches" to a pipeline | `grep` does the same; empty stdout + exit 0 is the unix contract |

## .taken, and why

**leave it.** acceptance 7 exists because the vibes render makes a claim — `matches: 0` reads as a
complete sentence. the pipeable mode makes no claim; empty stdout is an absence. the defect is
structurally absent. the repair would print a stderr line on every benign empty search, which turns
an anomaly channel into a metadata channel — new surface.

`[case14][t4]` walks the pipeable × zero-kind cell explicitly and names this fulcrum.

## .confidence — 74%

the call leaned on a distinction of my own — claim vs absence — that the wisher had not blessed.

## .the verdict

the wisher, shown the two kinds rendered side by side under each mode: *"yes, this is fine as is."*

empty stdout + exit 0 is the pipeable contract. `--help` warns the caller that two zero-kinds read
alike under pipeable. no code change.

the stated doubt named the true pivot, and the pivot held. four review rounds argued this in the
abstract; two commands settled it. hand up a fulcrum that can be demonstrated as a demonstration.

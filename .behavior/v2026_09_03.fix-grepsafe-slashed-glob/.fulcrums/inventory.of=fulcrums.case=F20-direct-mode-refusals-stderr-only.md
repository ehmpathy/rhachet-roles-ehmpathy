# F20 — pipeable-mode refusals write stderr only, against a blocker-graded rule

- **rework**: clean (code) · dirty (round)
- **status**: ✅ ruled 2026-09-23 — option A. the deviation stands
- **confidence**: 72% → ruled
- **raised**: by `r001` and `r010`, across six rounds
- **where**: `grepsafe.sh` — `emit_refusal`'s pipeable arm, and the diagnostics block
  (`--output direct` when raised; renamed at F23)

## .the fork

`rule.require.skill-output-streams`: failure writes stdout **and** stderr; *"error output without
stdout = blocker"*. under the pipeable mode, grepsafe writes every refusal to stderr only.

| option | shape |
|--------|-------|
| **A (taken)** | pipeable refusals stay stderr-only; vibes honors the rule verbatim |
| B | a refusal reaches stdout in pipeable mode too |
| C | amend the rule with a machine-mode carve-out every peer inherits |

## .taken, and why

**A.** the rule assumes stdout is a human's stream. under the pipeable mode it is data a caller
pipes, so a refusal there reads as a result — the confident-untrue report this route kills, moved
from the count to the error. observability stays on stderr, where a caller who pipes reads errors.

B has a measured cost: `[case24][t1]`, `[case37][t1]`, and `[case37][t6]` clamp that pipeable stdout
stays clean on a refusal. B breaks all three and lets a pipeline consume an error frame as data.

## .confidence — 72%

- the rule's enforcement line names a blocker, and a driver judged otherwise
- the rule may be what is wrong — C
- two lanes raised it independently

## .the verdict

the wisher, shown B's pipe-corruption cost: *"this is fine too."* no code change; the three clamps
stand.

the rule text is unchanged and still grades this a blocker, so every lane that reads it against this
file re-raises it. A and C are code-identical for grepsafe; they differ only in whether the general
shape is written down. C is a house-rule change, a council act:
`.dream/2026_09_24.amend-skill-output-streams-for-machine-modes.dream.md`.

## .the lesson

the call lived for five iterations as a code comment and drew repeat catches, each correct. a comment
defends a decision; it does not offer it for review. once filed as a fulcrum with its measured cost,
it was ruled in one exchange.

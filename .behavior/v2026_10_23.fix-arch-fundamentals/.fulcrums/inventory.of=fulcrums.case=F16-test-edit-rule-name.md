# F16 — the I28 rule's name: `rule.forbid.test-edit-without-named-proof`

## .the fork

the wisher ruled the direction: not every test needs an invariant; glue tests (implementation contracts) are legitimate with no inventory entry (seed `red-test-arbiter`). the old name, `test-edit-without-invariant`, read as "every test needs an invariant". the open call is the new name:

- **a.** `rule.forbid.test-edit-without-named-proof` — the forbidden act is an edit that names no proof; proof = an implementation contract or a domain invariant
- **b.** `rule.forbid.assertion-loosened-unnamed` — names the act, not the cure
- **c.** `rule.forbid.test-edit-to-pass` — shortest; drops the cure from the name

## .taken, and why at the time

**a.** the name holds the cure: "name the proof". it stays neutral between glue and invariant, so neither kind reads as second-class. b names a smell a reader must decode, and covers only a loosened assertion, not a delete or a re-snapshot. c reads as a ban on any test edit made to pass, which over-reaches: a retired glue test is an edit to pass, and a legitimate one.

## .rework

**clean.** one file pair plus 9 references (src: 1; route: 8), one `rhx sedreplace` away. no code depends on the name; the rule boots only on adoption (Q11).

## .confidence: 80%, and why it is not higher

"proof" may read as formal proof (dijkstra, ref.1978) rather than "what the test proves". the body defines it in its first lines, but a name should not lean on its body.

## .where

- `src/domain.roles/mechanic/briefs/practices/work.flow/refactor/rule.forbid.test-edit-without-named-proof.md` (+ `.min`)
- I28 row, `1.vision.inventory.lessons.md`; yield I28 bullet

## .verdict

**skepticized (2026-11-23), confident** — (a) stands. the body defines "proof" in its first line, and the wisher's own word for what a test shows is the same ("a test needs a named proof"). 85%

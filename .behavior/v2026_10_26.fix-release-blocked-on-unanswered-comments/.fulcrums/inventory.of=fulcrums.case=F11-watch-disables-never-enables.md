# F11 — watch never enables automerge, but disables it for safety

## the fork
- A: watch only reports a mid-watch unanswered row; no mutation, exit per checks
- B: watch disables an extant automerge when a new unanswered row appears, and exits 2; with automerge unfound it only reports

## taken: B, and why at the time
- peer review i002 (experience-coverage nitpick.4, dimensional nitpick.4) found the contract and the dimensions disagreed on watch
- under A, a pr whose automerge was set by an earlier apply, watched later by plain `--watch`, merges past a new comment — the #693 harm via the preview mode
- the one mutation moves toward the safe state; watch still never enables automerge

## rework: clean
drop the disable branch in the watch poll, derive `may_mutate` from `--apply` alone, and revert the spec lines below to "read-only".

## confidence: 75%, why low
the wish says watch and plan "still run" — a mutation in watch may surprise, even a safe one.
evidence from execution (r011 i015 nitpick.1): the spec still calls `--watch` read-only (`git.release.spec.matrix.md:77`, `:349`; `git.release.spec.diagram.md:340`), and "mutates" now has two predicates: `MODE == apply` in `git.release.sh`, and `apply || watch` in the gate. a watch disable also skips the apply gates (dirty tree, `git.commit.uses`). either verdict is a clean rework. the spec now states B (5.3): `git.release.spec.matrix.md` (vs --mode apply, the dirty note, the permission note) and `git.release.spec.diagram.md` (mode capabilities, `watch readonly no**`; the permission note). under A, those lines revert and `may_mutate` derives from `--apply` alone, so watch reports `exposed` as plan does.

## where
1.vision.yield.md § the contract · 1.vision.experience.dimensions.md (mid-watch rows) · case=4 [t1] · `emit_transport_status` (`may_mutate`) · the spec lines above

## verdict
(awaits council)

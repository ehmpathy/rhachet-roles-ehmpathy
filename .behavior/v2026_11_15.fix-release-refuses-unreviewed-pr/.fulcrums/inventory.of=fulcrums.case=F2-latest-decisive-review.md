# F2 — latest decisive review per human login decides

## .the fork
- (a) any APPROVED review by a human, ever, counts
- (b) per human login, take the latest review whose state is APPROVED, CHANGES_REQUESTED, or
  DISMISSED; approved iff at least one human's latest decisive state is APPROVED and no human's
  latest decisive state is CHANGES_REQUESTED

## .taken
(b). an approval later withdrawn (changes requested, or dismissed) is not an approval. this
mirrors how github computes `reviewDecision`, which reads empty on repos without a review rule.

evidence that COMMENTED is not decisive: ehmpathy/rhachet-roles-bhrain #742 holds
`uladkasach: CHANGES_REQUESTED` first, then later `COMMENTED` reviews from the same login,
and github's `reviewDecision` still reads `CHANGES_REQUESTED`. the multi-human veto clause has no
live sample yet.

"latest" is ordered by each review's `submitted_at` (rest field, verified on #1022), not by array
position.

## .rework
clean: a jq expression in one transformer.

## .confidence
88%. "no human CHANGES_REQUESTED" is stricter than the wish; a reviewer could rule it out.

## .where
the approval transformer in `git.release.operations.sh`.

## .verdict
awaits the commander.

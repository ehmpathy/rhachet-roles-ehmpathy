# F3 — gate runs on the pr this call would merge

## the fork
- A: gate the open pr this invocation would merge (feat pr, or release pr)
- B: on `--into prod`, also look back at every feat pr merged since the last tag

## taken: A, and why at the time
the wish places the gate in the release verb at the merge point; an already-merged pr cannot be un-merged, and a look-back needs a commit → pr map the verb does not hold today.

## rework: clean
add a look-back reader before the release-pr transport; no extant caller depends on its absence.

## confidence: 75%, why low
a feat pr merged by hand (outside git.release) with open threads would still reach prod under A.

## where
1.vision.yield.md § inventory, row "feat pr already merged"

## verdict
(awaits council)

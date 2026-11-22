# F10: the caller-clock line stays in the published howto

- fork: keep "a caller under its own time limit must allow more than the bound" in `src/…/howto.run-tests.[lesson].md` (published), or only in the internal invariants brief
- two lanes asked for opposite answers: `repo-rules` (rounds 1 and 3, nitpick) to move it out as a harness tip; `behavior-intent-coverage` (round 2, blocker) to put it back, since the vision names it for the howto and its audience reads the howto
- taken: keep it in both, with the published line phrased for any caller, not one harness: "a caller that runs the skill under its own time limit (an agent's shell call, a ci step) must allow more than the bound, e.g. 330s for the 300s default". the risk it names is universal to the skill's contract (any caller clock shorter than the bound hides the lesson), so it is no internal toolchain tip; the internal brief keeps the claude-code specifics (2 min default, 10 min max)
- rework: clean. one line in one brief
- confidence: 80%
- where: `howto.run-tests.[lesson].md` `.bound`; `git.repo.test.invariants.md` `### .the caller's own clock`
- verdict: open

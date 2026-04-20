# self-review r2: has-questioned-questions

triage of open questions in vision.

---

## questions triaged

### 1. timestamped trash?

**can answer via logic?** no — design choice with tradeoffs
**can answer via docs/code?** no
**external research?** no
**wisher knows?** yes — preference for simplicity vs history

**triage:** [wisher]

---

### 2. auto-cleanup?

**can answer via logic?** no — design choice
**can answer via docs/code?** no
**external research?** no
**wisher knows?** yes — preference for manual vs automated cleanup

**triage:** [wisher]

---

### 3. dedicated restore command?

**can answer via logic?** yes — wisher already said "cpsafe out of the trash cache"
**can answer via docs/code?** yes — wish.md explicit
**external research?** no
**wisher knows?** already answered

**triage:** [answered] — use cpsafe, no dedicated command

**how fixed:** moved from "questions for wisher" to assumptions section

---

### 4. path structure?

**can answer via logic?** partially — mirrored structure is more intuitive
**can answer via docs/code?** no
**external research?** no
**wisher knows?** yes — aesthetic choice

**triage:** [wisher] — though I recommend mirrored structure

---

### 5. worktrees?

**can answer via logic?** yes
**can answer via docs/code?** yes — verified worktree has own `.agent/` dir
**external research?** no
**wisher knows?** n/a

**answer:** rmsafe uses `git rev-parse --show-toplevel` which returns worktree root. worktrees have their own `.agent/` dir. so trash lives at worktree root, not main repo. this is correct — files in worktree should be trashed to worktree's cache.

**triage:** [answered]

**how fixed:** moved from questions to assumptions: "worktree trash is local to worktree root"

---

## summary

| question | triage |
|----------|--------|
| timestamped trash | [wisher] |
| auto-cleanup | [wisher] |
| dedicated restore command | [answered] — use cpsafe |
| path structure | [wisher] |
| worktrees | [answered] — local to worktree |

3 questions require wisher input, 2 answered now.

---

## fixes applied to vision

- moved "dedicated restore command" from questions to assumptions
- moved "worktrees" from questions to assumptions
- left wisher questions clearly marked

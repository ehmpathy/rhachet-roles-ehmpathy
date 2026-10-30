# F9 — plan previews and flags where a gate guards only the mutation

- **fork**: (a) plan refuses on every gate, as `git.branch.rebase begin` does · (b) plan refuses only on gates that guard the intent or a human's halt (on-main, global/org block, no sponsor); on gates that guard only the mutation (dirty tree, rebase in flight, no quota) it previews and flags
- **taken**: (b). plan mutates naught, so a dirty tree cannot be harmed by a preview; `git.commit.set` already lets plan through on no-quota while it refuses plan on blocker and sponsor (`:709-733`, `:957-980`, quota guard `:789` skips plan). (b) extends that same split to the merge verb's own gates
- **rework**: clean. a guard moves above or below the mode check
- **risk**: low. plan mutates naught in either choice; the worst case is a clone that reads a plan's flag as a pass. apply still refuses on the same gate, so no merge lands over uncommitted work
- **confidence**: 85%
- **where**: inventory #11 #13 #15; yield invariant 7; dimensions § hidden axis
- **verdict**: answered by precedent in `git.commit.set`; surfaced by peer review i002 blocker.1

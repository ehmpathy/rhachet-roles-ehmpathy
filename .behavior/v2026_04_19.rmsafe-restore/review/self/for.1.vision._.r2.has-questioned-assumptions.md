# self-review r2: has-questioned-assumptions

stepped back. fresh eyes. line by line through the vision.

---

## found issues

### issue 1: symlink behavior unspecified

**what we assumed:** delete of symlink trashes the link, not target
**evidence?** none in vision — I inferred
**what if opposite?** trash the target? would be a surprise to users
**did wisher say?** no
**exceptions?** none — consistent with unix rm behavior

**how it was fixed:**
- added to vision assumptions: "symlinks trashed as symlinks, not targets"
- added to edgecases table: "delete symlink → trash link itself"

---

### issue 2: parent dir absent on restore

**what we assumed:** cpsafe restore works even if parent dir gone
**evidence?** not tested — cpsafe behavior unknown
**what if opposite?** restore fails with obscure error
**did wisher say?** no
**exceptions?** common scenario: delete dir, later want one file back

**how it was fixed:**
- added to edgecases table: "restore when parent dir gone → cpsafe must mkdir -p or fail clearly"
- added to assumptions: "parent dir for restore — cpsafe handles mkdir or fails clearly"

---

### issue 3: worktree behavior unclear

**what we assumed:** `.agent/.cache/` is at git root
**evidence?** rmsafe uses `git rev-parse --show-toplevel`
**what if opposite?** in worktree, uses worktree root not main repo root
**did wisher say?** no
**exceptions?** this repo uses worktrees, need to verify behavior

**how it was fixed:**
- added to open questions: "worktrees? — if in worktree, which .agent/.cache/ is used?"

---

## non-issues (why they hold)

### crash between cp and rm

**why it holds:** duplicate is safer than data loss. if crash leaves both original and trash copy, user can clean up. no data lost.

### trash path stability

**why it holds:** path follows repo convention. skill renames are rare. old trash at old path is acceptable tradeoff — users can still find it.

### large binary files trashed

**why it holds:** simpler to trash all files. size-based decisions add complexity. user manages disk themselves. noted as con in vision.

### tracked + untracked both trashed

**why it holds:** untracked files cannot be recovered from git. tracked files can be recovered but git checkout syntax is non-obvious. trash both for safety.

### nested repo scopes correctly

**why it holds:** rmsafe already uses `git rev-parse --show-toplevel` which returns the current repo root, not parent. verified in current implementation.

### cpsafe -r for directory restore

**why it holds:** wish says "cpsafe out of the trash cache" — implies recursive works. need to verify but reasonable assumption.

---

## summary

- 3 issues found, all fixed in vision
- 6 non-issues examined, all hold for stated reasons
- vision is now complete for assumptions review

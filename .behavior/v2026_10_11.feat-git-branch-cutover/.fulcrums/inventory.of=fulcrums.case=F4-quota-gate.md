# F4: commit quota gate

- **fork**: apply (a) needs no meter at all, (b) needs a granted `git.commit.uses` quota when it
  replays picks, without decrement, or (c) mirrors rebase: quota + push permission + decrement.
- **taken**: (b). replay writes commits under the seaturtle committer, so a human should have
  granted commit rights; but it authors no new work, so no decrement; and it never pushes, so no
  push permission. (rebase gates on push permission, `git.branch.rebase.begin.sh:86-95`; its header
  gives no reason — the likely one is that a rebased branch needs a force push, which cutover never
  makes. inferred, not verified.)
- **rework**: clean — a guard block, added or removed.
- **confidence**: 60%. the wisher did not mention the meter; any of the three is defensible.
- **where**: q3; a1.
- **verdict**: overruled by wisher, 2026-10-12 — "it should require git.branch.uses quota". the gate is a `git.branch.uses` quota, not the commit quota. 2026-10-13: "yeah, you'll need to make git.branch.uses meter" — the meter ships in this tree as a peer of `git.commit.uses` (same levels, precedence, human-only grants). 2026-10-14: spend rule approved by wisher — one unit per apply cut; plan, settle, and refusals spend none; `allow` = unlimited

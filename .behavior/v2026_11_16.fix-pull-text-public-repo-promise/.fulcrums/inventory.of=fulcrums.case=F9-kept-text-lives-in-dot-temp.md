# fulcrum F9: a held @stdin text is kept in ./.temp, named by its digest

## .the fork
a held write keeps its spent @stdin text for the rerun to pipe back. where?
- (a) `./.temp/<name>.<sha8>.md` in the cwd
- (b) under the git dir (`git rev-parse --git-path rhx/...`)
- (c) `${TMPDIR:-/tmp}/rhx/...`

## .the reviewers disagree
- enroll-impl-behavior-intent (i006 blocker.1) refuted (b): in a linked worktree the git dir resolves to an absolute path inside the main clone, which the cross-tree hook refuses, so the printed rerun cannot be pasted in the standard `_worktrees` layout. it asked for (a)
- enroll-impl-arch-defects (i007 blocker.1) asks for (b), or (c) outside a repo, to keep scratch out of the worktree

## .taken: (a)
- it is the family's extant convention on main: every pull get/set hint already names `./.temp/{body,title,reply}.md`, and this repo ignores `.temp`
- the printed line is cwd-relative, so it pastes in every layout, linked worktrees included
- (c) meets this repo's own guards on tmp paths and a read outside the repo
- set's work guards skip set's own scratch (`.temp/commit.*.md`), clamped by set case60 t9 in a repo that does not ignore `.temp`
- the digest name closes the shared-slot harm (i006 urgent)

## .rework
clean: the path rule lives in one leaf, `as_text_keep_path`; a switch to (b) or (c) is one edit plus the test asserts.

## .the residual
in a repo that does not ignore `.temp`, a held pull-verb text shows as untracked to a later `git.commit.set` or cutover. the same holds today for the files the family's own hints tell callers to write there. a repo-wide ignore of `.temp` scratch, or a shared exclude, is the follow-up shape.

## .confidence
75%: the reviewers split; the commander may prefer (b) with a worktree-safe relative form.

## .verdict
open

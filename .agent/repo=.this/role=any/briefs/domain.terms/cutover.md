# domain term: cutover

## .the term

| term | kind | shape | sense |
|---|---|---|---|
| **cutover** | dop | `[verb]` (`git.branch.cutover`) | move the live work off a spent branch onto a fresh branch cut from the base, so the next release starts clean |

the cli surface: `rhx git.branch.cutover begin | continue | abort`, metered by `rhx git.branch.uses`.

the atoms the cutover composes each hold a file of their own, since `#531` cutback reuses them:
`park.md` · `carry.md` · `halt.md` · `rescue.md` · `snapshot.md`.

## .the evidence — the narrative it was dug from

measured 2026-10-11 in `uladkasach/nheuron` (the wish, `.behavior/v2026_10_11.feat-git-branch-cutover/0.wish.md`):

1. a branch's first `feat` squash-merged to main
2. the branch could now take only a `cont:` commit, so the next release could not be a `feat`
3. the human cut a fresh branch from `origin/main` by hand, re-picked the shas that still
   mattered, and carried the uncommitted tree across
4. a plain push from the hand-cut branch aimed at `main`, since it tracked `origin/main`

each step names a piece of the domain, and the words are the ones the human used:

| step | the human said | the term |
|---|---|---|
| 3, whole | "cut over to a fresh branch" | **cutover** |
| 3, the shas | "re-picked the shas that still mattered" | **pick** |
| 3, the shas that no longer mattered | (unnamed; they stayed on the spent branch) | **left behind** |
| 3, the uncommitted tree | "set the edits aside, then put them back" | **park**, then **carry** |
| a pick that conflicts | "stop there, I'll settle it" | **halt** |

## .the etymology

- **cutover** — the ops and telecom word for the moment a live load moves from an old system to its
  replacement (a cutover window, a cutover plan). the old system is retired, not merged. that is the
  exact relation here: the spent branch is left behind, never rebased into the new one

the cutover's own step and part names — fields and phases of this one verb, not atoms reused
elsewhere:

- **pick** — from `git cherry-pick`: to choose one commit out of a history and replay it. the human
  names the shas; each is one pick (`picks[]`)
- **claim** — the first phase: to stake a claim is to mark ground as yours before you work it. the
  state is written and the park made; no file has moved, so no unit is spent
- **left behind** — what stays put when the rest moves on. the commits the source holds past the
  base that no pick named; the report lists them, so the human sees what did not ride across
  (`left_behind[]`)

## .the rejected alternatives

| word | why rejected |
|---|---|
| **sprout** (`#504`) | names the new branch's birth, not the move of the work. a sprout carries naught; the domain's whole point is what rides across. `#504` closes in favor of `#528` |
| **rebase** | 🔴 extant, and the opposite act: a rebase keeps the branch and replays all of its history. the trap this verb exists for is that history. `git.branch.rebase help` points here |
| **transplant** / **migrate** | `migrate` is overloaded org-wide (db migrations); `transplant` reads as one-way surgery on a single commit |

## .the attributes

the state (`<git-dir>/cutover/state.json`): `schema` · `into` · `source_name` · `source_sha` ·
`base_kind` (`@main` \| `@tree` \| branch) · `base_label` · `base_sha` · `picks[]` (`sha`, `status`,
`new`, `head_before`, `reason`, `replayed[]`) · `pick_index` · `tracked[]` · `untracked[]` ·
`left_behind[]` · `phase` · `halt` · `halt_snapshot` · `conflicts[]` · `carry` · `abort_begun` ·
`rescue_refs[]` · `reset_begun` · `unstaged[]`. begin writes every field at once, bar two that
joined schema 3 late: `unstaged[]` reads with a `// []` fallback (absent = none unstaged), and a
pick with no `replayed[]` falls back to its source diff.

**schema** versions the shape (3); a verb refuses a state written under another, since a field it
reads would come back empty. **unstaged** lists each path continue unstaged past a pick: kept on
disk, out of the pick commit, named in the report. **replayed** lists the paths a pick's replay
staged, read while the index held the replay alone; continue keeps them in the pick commit, since a
merge can stage paths the pick's own diff never names (an edit that follows a base rename). **abort_begun** marks an abort underway: a rerun of abort finishes
it, and continue refuses. **reset_begun** marks begin's reset as underway, written just before it:
a back-out after it restores the edits by abort's own ladder, and the tree alone cannot tell.

**source vs base.** the flag `--from` names the **base** (`base_kind`, `base_label`, `base_sha`).
the branch the work leaves is the **source** (`source_*`, the report's `source:` line). one word,
one sense: `from` names only the flag. the key is `source`, not `spent`: `spent` already names the
quota spend (`spend_branch_use`, "no unit is spent"), and a second sense would overload it.

**phase** names the step underway: `claim` → `cut` → `picks` → `carry`, set only through
`set_state_phase`, which refuses any other literal.

## .the invariants

1. **the spent branch is never moved or deleted** by begin or continue; abort restores it as it stood
2. **the new branch has no upstream**, so a plain push can never aim at main
3. **a reset runs only over a park git can name** — written, then read back (inv-10)
4. **untracked files are never written, moved, or deleted**; a base that would overwrite one refuses
5. **one cutover per worktree**; a foreign op in flight refuses, and names its own settle verb
6. **abort deletes only what this cutover made**: an unpushed branch, with no commit it did not record
7. **abort acts only on a source that stands where the cutover left it**; a moved or deleted source refuses
8. **a halt is a constraint (exit 2)**; a malfunction keeps the state so abort can undo it (exit 1)
9. **no verb erases an edit it has not saved** (`rescue.md`)

## .see also

- `.behavior/v2026_10_11.feat-git-branch-cutover/1.vision.yield.md` — the vision these terms serve
- `.behavior/v2026_10_11.feat-git-branch-cutover/1.vision.experience.dimensions.md` — the walked space
- architect `rule.require.persist-domain-term-evidence` — why each term holds its own file
- `sponsor.md` — the precedent for this file's shape

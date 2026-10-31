# domain term: cutover (with park, carry, halt)

## .the terms

| term | kind | shape | sense |
|---|---|---|---|
| **cutover** | dop | `[verb]` (`git.branch.cutover`) | move the live work off a spent branch onto a fresh branch cut from the base, so the next release starts clean |
| **park** | dobj + act | `refs/worktree/cutover/{tree,index}` | a verified copy of the tracked edits, held in this worktree's own refs while the tree resets |
| **carry** | act | the last step of a cutover | lay the parked edits down onto the new branch, unstaged |
| **halt** | dobj state | `.halt` in the state | a stop that waits on a human settle — a pick or carry conflict — resumed by `continue`, undone by `abort`. an interruption (a kill, a failed step) after the switch has no halt, and `continue` resumes it too |

the cli surface: `rhx git.branch.cutover begin | continue | abort`, metered by `rhx git.branch.uses`.

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
| 3, the uncommitted tree | "set the edits aside, then put them back" | **park**, then **carry** |
| a pick that conflicts | "stop there, I'll settle it" | **halt** |

## .the etymology

- **cutover** — the ops and telecom word for the moment a live load moves from an old system to its
  replacement (a cutover window, a cutover plan). the old system is retired, not merged. that is the
  exact relation here: the spent branch is left behind, never rebased into the new one
- **park** — set aside in a known place, to be taken up again. a parked car is neither gone nor in use
- **carry** — take along, intact, to the new place
- **halt** — a stop that expects a resume; distinct from a failure, which expects a fix

## .the rejected alternatives

| word | why rejected |
|---|---|
| **sprout** (`#504`) | names the new branch's birth, not the move of the work. a sprout carries naught; the domain's whole point is what rides across. `#504` closes in favor of `#528` |
| **rebase** | 🔴 extant, and the opposite act: a rebase keeps the branch and replays all of its history. the trap this verb exists for is that history. `git.branch.rebase help` points here |
| **transplant** / **migrate** | `migrate` is overloaded org-wide (db migrations); `transplant` reads as one-way surgery on a single commit |
| **stash** (for park) | 🔴 `git stash` is one stack shared by every worktree; another session can pop it. the park is per worktree by construction, so the word must not invite that read |
| **pause** / **stop** (for halt) | `pause` implies no human act is owed; `stop` does not imply a resume |

## .the attributes

the state (`<git-dir>/cutover/state.json`, schema 1): `into` · `source_name` · `source_sha` ·
`base_kind` (`@main` \| `@tree` \| branch) · `base_label` · `base_sha` · `picks[]` (`sha`, `status`,
`new`, `head_before`, `reason`) · `pick_index` · `tracked[]` · `untracked[]` · `left_behind[]` ·
`phase` · `halt` · `conflicts[]` · `carry`.

**source vs base.** the flag `--from` names the **base** (`base_kind`, `base_label`, `base_sha`).
the branch the work leaves is the **source** (`source_*`, the report's `source:` line). one word,
one sense: `from` names only the flag. the key is `source`, not `spent`: `spent` already names the
quota spend (`spend_branch_use`, "no unit is spent"), and a second sense would overload it.

**phase** names the step underway: `claim` → `cut` → `picks` → `carry`. `claim` writes the state
and makes the park; no file has moved yet, so abort only drops the refs and no unit is spent.

## .the invariants

1. **the spent branch is never moved or deleted** by begin or continue; abort restores it as it stood
2. **the new branch has no upstream**, so a plain push can never aim at main
3. **a reset runs only over a park git can name** — written, then read back (inv-10)
4. **untracked files are never written, moved, or deleted**; a base that would overwrite one refuses
5. **one cutover per worktree**; a foreign op in flight refuses, and names its own settle verb
6. **abort deletes only what this cutover made**: an unpushed branch, with no commit it did not record
7. **abort acts only on a source that stands where the cutover left it**; a moved or deleted source refuses
8. **a halt is a constraint (exit 2)**; a malfunction keeps the state so abort can undo it (exit 1)

## .see also

- `.behavior/v2026_10_11.feat-git-branch-cutover/1.vision.yield.md` — the vision these terms serve
- `.behavior/v2026_10_11.feat-git-branch-cutover/1.vision.experience.dimensions.md` — the walked space
- architect `rule.require.persist-domain-term-evidence` — why this file exists
- `sponsor.md` — the precedent for this file's shape

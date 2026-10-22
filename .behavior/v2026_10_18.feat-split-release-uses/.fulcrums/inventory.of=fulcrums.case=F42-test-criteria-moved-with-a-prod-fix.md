# F42 — a test criterion that moved with a deliberate prod fix stays moved

## .the fork

5.3 i004 r12 (test-intent) reads each changed assertion in a touched suite as a loosened lock.
some of them moved because the prod behavior they pinned was a defect, fixed in this pr.

- **A (taken)** — keep the new criterion where the old one pinned a defect; name the defect and
  the clamp that now guards the fix
- **B** — restore the main-era assertion, and with it the defect it pinned
- **C** — split each fix into its own pr, so this pr moves no criterion outside the wish

## .taken, and why

A. a test that pins a defect is not an intent to preserve; `rule.require.test-covered-repairs`
asks the opposite — the test must go red on the defect. C is ruled out by F27 (one pr carries
the split, the 1.49 layout, the bhrain patch, and the ci cures). each moved criterion, with its
cause:

| test | main pinned | the defect | now pins |
|---|---|---|---|
| `git.repo.get` `[case7]` | a real gh with no credential reads `repo not found` | a login fault told the human a real repo was absent | `[t0]` a 404 reads `repo not found`; `[t1]` the real gh with no credential reads `gh is not logged in`, never `repo not found` |
| `git.repo.get` `[case38]` | exit 2 on a git fault mid-read | a broken git read as caller error (✋) | exit 1, `💥 MalfunctionError` (`rule.require.exit-code-semantics`) |
| `git.repo.get` `[case28]` | the hint names `git -C <path> worktree list` | the hint named a command the check-permissions hook blocks | the hint names the paved `rhx git.repo.get files --in <repo> --tree <name>`; the raw call must be absent |
| `git.branch.rebase` dispatch `[case6]` | exit 1 on "no rebase in progress" | a caller-must-fix refusal exited as a malfunction | exit 2 behind `✋ ConstraintError: no rebase in progress` (F22) |
| `getMechanicRole.test` | the self-boot hooks exist | rhachet 1.50 `repo introspect` refuses a role whose onBoot runs `rhachet roles boot`; the build failed | no hook boots a role; boot.md renders the briefs (7113638) |
| `git.release` p1 / p2 merged leaf | `-> and merged already` on the automerge leaf | two facts fused into one leaf, joined by an arrow in prose | `├─ 🌴 automerge enabled [added]` then `└─ 🌴 already merged` — both facts, one leaf each |
| `refuse-human-grant` sedreplace | a match that held the stamp was filtered, the rest rewritten | the sedreplace bridge forged the release stamp (5.3 r4 i001 blocker.3, conceded urgent) | the whole plan refuses, loud, and names the stamp: fail closed |
| `symlink` | `existing:` | the term hook forbids that word (rule.forbid.term=existing) | `found:` |
| tone churn | `lets`, `didnt`, `bond fire`, `$ cat` | prose blemishes the snapshot lanes raised in 5.3 i002 / i003 | `let's`, `didn't`, `bonfire`, tree glyphs |

`git.repo.get` snapshots with a gh-credential line do not read the host: each such case deletes
`GH_TOKEN` and `GITHUB_TOKEN` and points `GH_CONFIG_DIR` at an empty dir.

## .rework

clean — each row is one assertion and its snapshot; a reversal restores the main-era line.

## .confidence

80% — a reader may still want the chore fixes shipped apart, which F27 rules against.

## .where

the tests named in the table, under `src/domain.roles/mechanic/`.

## .verdict

open — for the fulcrum council.

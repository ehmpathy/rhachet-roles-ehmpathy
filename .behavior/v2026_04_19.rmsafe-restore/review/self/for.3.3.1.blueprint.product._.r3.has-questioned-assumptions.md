# self-review: has-questioned-assumptions

surfaced technical assumptions in blueprint.

---

## assumption.1: cp before rm is safe order

**assumed:** cp then rm prevents data loss
**what if opposite?** rm then cp = data lost if crash between
**evidence:** standard safe-delete pattern
**simpler approach?** mv would be atomic but fails cross-filesystem
**verdict:** holds — cp then rm is correct pattern

---

## assumption.2: cp -P preserves symlinks correctly

**assumed:** -P flag trashes symlink, not target
**what if opposite?** without -P, cp dereferences and copies target content
**evidence:** man cp confirms -P behavior
**verdict:** holds — -P is correct flag

---

## assumption.3: mkdir -p is safe for nested paths

**assumed:** mkdir -p creates all parent dirs atomically
**what if opposite?** partial creation on failure?
**evidence:** mkdir -p is idempotent and atomic per POSIX
**verdict:** holds — standard pattern

---

## assumption.4: inline echo > .gitignore is safe

**assumed:** echo -e "*\n!.gitignore" works correctly
**what if opposite?** could fail on some shells
**evidence:** bash handles -e flag
**simpler approach?** printf is more portable
**verdict:** ISSUE — should use printf for portability

**fix:** change to `printf "*\n!.gitignore\n" > "$TRASH_DIR/.gitignore"`

---

## assumption.5: realpath handles all edge cases

**assumed:** realpath works for symlinks, relative paths, etc.
**what if opposite?** realpath -m handles nonextant paths
**evidence:** extant code already uses this pattern
**verdict:** holds — follows extant pattern

---

## assumption.6: REPO_ROOT is correct for worktrees

**assumed:** `git rev-parse --show-toplevel` returns worktree root
**what if opposite?** returns main repo?
**evidence:** verified in vision review — worktrees have own root
**verdict:** holds — verified behavior

---

## assumption.7: overwrite in trash is acceptable

**assumed:** cp overwrites extant trash file silently
**what if opposite?** user loses previous version
**evidence:** vision explicitly chose single-version model
**verdict:** holds — vision decision

---

## found issues

1. **echo -e portability** — should use printf instead

---

## non-issues (why they hold)

| assumption | evidence |
|------------|----------|
| cp before rm | standard safe pattern |
| cp -P | man page confirms |
| mkdir -p | POSIX idempotent |
| realpath | extant pattern |
| worktree root | verified |
| overwrite | vision decision |

---

## fix applied

blueprint implementation notes updated: use printf instead of echo -e

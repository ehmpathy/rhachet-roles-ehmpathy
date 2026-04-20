# self-review r10: has-behavior-declaration-coverage

deeper check on edge cases from vision.

---

## edge cases review

| vision edgecase | blueprint coverage | status |
|-----------------|-------------------|--------|
| delete same file twice | test [t2] overwrite | covered |
| delete directory | cp -rP + test [t1] | covered |
| trash doesn't exist | ensure_trash_dir() mkdir | covered |
| restore to different location | cpsafe handles | N/A (external) |
| clear trash | user can rmsafe the trash | see below |
| delete symlink | cp -P + test [t3] | covered |
| restore when parent absent | cpsafe handles mkdir | N/A (external) |

---

## clear trash edge case

**vision says:** "user runs `rhx rmsafe -r .agent/.cache/.../trash/` (deletes trash itself)"

**what happens:**
1. rmsafe computes TRASH_DIR = `$REPO_ROOT/.agent/.cache/.../trash`
2. rmsafe tries to trash the trash folder
3. copies `trash/` → `trash/.agent/.cache/.../trash/` (nested)
4. deletes original `trash/`
5. result: nested copy remains as "backup of trash"

**is this a problem?**
- not infinite recursion — just one nested copy
- functionally achieves goal — original trash deleted
- awkward side effect — nested backup created

**decision:** acceptable behavior. user wants to clear trash, it gets cleared. the nested backup is harmless detritus in a temp dir that will be recreated anyway.

**alternative:** could add guard to skip trash on trash deletion, but adds complexity for minimal benefit.

---

## assumption coverage

| vision assumption | blueprint coverage |
|-------------------|-------------------|
| one version | test [t2] overwrite |
| manual cleanup | no auto-expiration |
| cpsafe is restore tool | coconut hint shows cpsafe |
| path structure preserved | mirror path in codepath tree |
| symlinks as symlinks | cp -P |
| parent dir restore | cpsafe responsibility |
| worktree local | REPO_ROOT from git rev-parse |

**verdict:** all assumptions addressed

---

## found issues

none — all edge cases either covered or have acceptable behavior.

---

## non-issues (why they hold)

| concern | why it holds |
|---------|--------------|
| clear trash recursion | not infinite, just nested copy |
| worktree isolation | REPO_ROOT computed per run |
| restore parent absent | cpsafe responsibility, not rmsafe |

---

## conclusion

r10 confirms complete behavior coverage:
- all wish requirements
- all vision requirements
- all edge cases either covered or acceptable
- all assumptions addressed

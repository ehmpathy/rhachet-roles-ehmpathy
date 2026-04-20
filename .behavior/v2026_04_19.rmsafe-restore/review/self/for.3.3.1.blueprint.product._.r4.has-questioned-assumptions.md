# self-review r4: has-questioned-assumptions

deeper examination. read blueprint codepath tree line by line.

---

## codepath assumptions re-examined

### assumption: "validate within repo" needed for source but not trash

**what blueprint says:** `[○] validate target is within repo` for source
**what about trash?** blueprint doesn't explicitly say no validation for trash dest
**question:** should we validate trash destination?
**answer:** no — trash is always `$REPO_ROOT/.agent/...` by construction
**evidence:** TRASH_DIR computed from REPO_ROOT, always within repo
**verdict:** holds — no validation needed for trash

### assumption: glob expansion order is deterministic

**what blueprint says:** `[○] expand glob to FILES[]`
**question:** does file order matter for trash?
**answer:** no — each file trashed independently, order irrelevant
**verdict:** holds — order doesn't affect correctness

### assumption: cp overwrites atomically

**what blueprint says:** cp overwrites extant trash
**question:** is overwrite atomic?
**answer:** cp writes to temp then renames on some systems
**counterexample:** large file copy interrupted = partial file
**mitigation:** cp to temp, mv to final (atomic rename)
**verdict:** ISSUE — should consider atomic overwrite pattern

**analysis:** for trash, partial file is acceptable. user can re-delete. not a blocker.
**decision:** accept risk — simplicity > perfect atomicity for trash

### assumption: coconut output is always useful

**what blueprint says:** show coconut hint for all successful deletes
**question:** is hint useful for single-file delete? for glob?
**answer:** yes — user learns restore capability
**verdict:** holds — discoverability matters

### assumption: test snapshots will capture coconut format

**what blueprint says:** `[+] snapshots for coconut output format`
**question:** will snapshot capture exact restore path?
**answer:** yes — but path includes temp dir, needs sanitization
**evidence:** extant sanitizeOutput() handles this
**verdict:** holds — sanitization pattern extant

---

## deeper: what assumptions are in the test tree?

### assumption: runInTempGitRepo returns tempDir

**what blueprint says:** extend to return tempDir for trash verification
**question:** does it already return tempDir?
**check:** yes — citation shows `return { stdout, stderr, exitCode, tempDir }`
**verdict:** holds — already returns tempDir

### assumption: fs.existsSync works for trash verification

**question:** does fs.existsSync work for symlinks?
**answer:** yes — returns true if path exists (link or target)
**for symlink in trash:** need fs.lstatSync to verify it's a link
**verdict:** ISSUE — symlink test needs lstatSync, not existsSync

**fix:** test tree should use lstatSync for symlink assertion

---

## found issues

1. **echo -e** — fixed in r3 (use printf)
2. **symlink verification** — use lstatSync not existsSync

---

## non-issues (why they hold)

| assumption | why it holds |
|------------|--------------|
| no trash validation | trash path by construction |
| glob order | irrelevant to correctness |
| cp overwrite | acceptable risk for trash |
| coconut usefulness | discoverability |
| snapshot sanitization | extant pattern |
| tempDir return | already in signature |

---

## fixes applied

1. blueprint updated: printf instead of echo -e (r3)
2. test approach: use lstatSync for symlink assertions (noted for implementation)

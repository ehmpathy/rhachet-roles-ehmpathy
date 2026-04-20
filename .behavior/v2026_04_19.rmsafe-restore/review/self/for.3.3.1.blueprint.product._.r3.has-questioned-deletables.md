# self-review r3: has-questioned-deletables

third pass. challenged each component harder.

---

## re-examination: what is truly needed?

the wish asks for 3 things:
1. cp to trash before rm
2. gitignore the trash
3. output restore hint

all else is implementation detail.

---

## component-by-component deletion challenge

### ensure_trash_dir() function

**question:** can we inline this?
**answer:** yes, could be 3 lines inline
**should we?** function adds clarity, but is it overkill for 3 lines?
**simplest version:** inline the mkdir + gitignore

**verdict:** ISSUE — function may be over-abstraction for 3 lines

**fix decision:** keep function — it's called from 2 places (dir removal + file removal). DRY justifies it.

### print_coconut_hint() in output.sh

**question:** can we inline this in rmsafe.sh?
**answer:** yes
**should we?** output.sh pattern exists for consistency
**simplest version:** echo directly in rmsafe.sh

**verdict:** ISSUE — new function in shared file may be overkill

**fix decision:** keep — coconut may be reused by other tools later. follows extant pattern.

### cp -rP flags

**question:** can we simplify?
**answer:** -r needed for dirs, -P needed for symlinks
**simplest version:** these are the minimal flags

**verdict:** holds — both flags required

### mirrored path structure

**question:** could we flatten paths?
**answer:** yes — encode as trash/path_to_file.ts
**simplest version:** flat is simpler implementation
**but:** mirrored is simpler UX (find files by path)

**verdict:** holds — UX simplicity > impl simplicity

---

## what if we started from zero?

if I had to implement this from scratch with no blueprint:
1. cp file to $TRASH_DIR/$REL_PATH
2. rm file
3. echo restore hint

would I add ensure_trash_dir()? yes — mkdir + gitignore logic repeats
would I add print_coconut_hint()? maybe not — could inline

---

## found issues

### issue: print_coconut_hint() may be unnecessary abstraction

**analysis:** only rmsafe uses it now. add to output.sh implies shared use.

**counter:** output.sh has 5 functions. one more keeps consistency. and other tools may add coconut hints.

**decision:** keep — consistency with extant pattern. cost is low (one function).

---

## non-issues (why they hold)

| component | why it holds |
|-----------|--------------|
| ensure_trash_dir() | called from 2 places, DRY |
| print_coconut_hint() | follows output.sh pattern |
| cp -rP | minimal flags needed |
| mirrored paths | UX > impl simplicity |

---

## conclusion

all components justified. no deletions needed. r2 issue (trash boundary check) already identified for removal.

# self-review: has-behavior-declaration-coverage

## the question

for each requirement in the vision and criteria, ask:
- is it addressed in the blueprint?
- is the implementation approach complete?
- did we skip or forget any part of the spec?

---

## vision coverage

### usecases from vision

| usecase | goal | vision contract | blueprint line |
|---------|------|-----------------|----------------|
| lock conflict settled | regenerate lock | `rhx git.branch.rebase lock refresh` | line 6: "regenerate lock file mid-rebase", line 16: `git.branch.rebase.lock.sh` |
| proactive suggestion | remind mechanic | output from `take` when lock file settled | line 7: "proactive suggestion in take output", lines 18-19: take.sh update |

**why it holds:** both usecases from vision are addressed in blueprint summary (lines 5-7) and filediff tree (lines 14-19).

---

### contract inputs/outputs from vision

**vision specifies:**
```
inputs:
  - (none) — detects package manager automatically

outputs:
  - regenerated lock file (staged)
  - or error if:
    - no rebase in progress
    - no lock file extant
    - pnpm/npm install fails
```

**blueprint line-by-line coverage:**

| vision output | blueprint line | codepath |
|---------------|----------------|----------|
| auto-detect pm | line 46-54 | detect lock file → detect package manager |
| regenerated lock (staged) | line 61 | stage lock file |
| error: no rebase | line 45 | guard: is_rebase_in_progress |
| error: no lock file | line 50 | guard: at least one lock file extant |
| error: install fails | line 60 | guard: install succeeded |

**why it holds:** all 5 output cases from vision map to explicit blueprint lines.

---

### timeline example from vision

**vision shows:**
```
$ rhx git.branch.rebase take --whos theirs pnpm-lock.yaml
   └─ lock taken, refresh it with: ⚡
      └─ rhx git.branch.rebase lock refresh

$ rhx git.branch.rebase lock refresh
   ├─ detected: pnpm
   ├─ run: pnpm install
   ├─ staged
   │  └─ pnpm-lock.yaml ✓
   └─ done
```

**blueprint line-by-line coverage:**

| vision output | blueprint line | description |
|---------------|----------------|-------------|
| suggestion in take | line 74-75 | "lock taken, refresh it with: ⚡" + command |
| detected: pnpm | line 63 | output: detected: {pm} |
| run: pnpm install | line 64 | output: run: {pm} install |
| staged: pnpm-lock.yaml | line 65 | output: staged: {lockfile} ✓ |
| done | line 66 | output: done |

**why it holds:** each line of vision timeline maps to explicit blueprint output lines 62-66.

---

### pit of success edgecases from vision

| edgecase | vision action | blueprint line | test case |
|----------|---------------|----------------|-----------|
| no rebase in progress | error: "no rebase in progress" | line 45 (guard) | case4 (lines 100-103) |
| no lock file extant | error: "no lock file found" | line 50 (guard) | case5 (lines 105-108) |
| install fails | show error output | line 60 (guard) | case9 (lines 126-129) |
| pnpm-lock + pnpm not installed | error: "pnpm not found" | line 52 (detect) | case6 (lines 110-113) |
| yarn.lock + yarn not installed | error: "yarn not found" | line 54 (detect) | case7 (lines 115-118) |
| both pnpm-lock and package-lock | prefer pnpm if available | lines 169-176 (priority) | case8 (lines 120-124) |
| multiple lock files in `take .` | show suggestion once | line 73 (for each) | case12 (lines 140-142) |

**why it holds:** all 7 edgecases map to explicit blueprint lines and test cases.

---

### wisher decisions from vision

| decision | vision states | blueprint line | evidence |
|----------|--------------|----------------|----------|
| rebase-only | command should NOT work outside rebase | line 45 | guard: is_rebase_in_progress |
| suggest, not auto-refresh | just suggest after `take` | lines 73-75 | take.sh update shows suggestion only, no auto-run logic |
| support yarn.lock | yes to yarn | lines 49, 54, 59 | detect yarn.lock, check yarn installed, run yarn install |

**why it holds:** all 3 wisher decisions map to explicit blueprint lines.

---

## criteria coverage

### usecase.1: refresh lock file after take

**criteria episode: successful refresh**
```
given a rebase in progress
  given a lock file was taken
    when lock refresh is run
      then lock is regenerated
      then lock is staged
      then output shows success with turtle vibes
```

**blueprint line-by-line coverage:**

| criteria then | blueprint line | description |
|---------------|----------------|-------------|
| lock is regenerated | lines 56-59 | run install (pnpm/npm/yarn) |
| lock is staged | line 61 | stage lock file |
| turtle vibes output | lines 62-66 | output with turtle vibes header and tree |

**test coverage:** case1 (lines 85-88), case2 (lines 90-93), case3 (lines 95-98)

---

**criteria episode: error cases**

| error case | criteria says | blueprint line | test lines |
|------------|---------------|----------------|------------|
| no rebase | error: "no rebase in progress" | line 45 (guard) | lines 100-103 (case4) |
| no lock file | error: "no lock file found" | line 50 (guard) | lines 105-108 (case5) |
| pnpm not installed | error: "pnpm not found" | line 52 (detect) | lines 110-113 (case6) |
| yarn not installed | error: "yarn not found" | line 54 (detect) | lines 115-118 (case7) |
| install fails | show error output | line 60 (guard) | lines 126-129 (case9) |

**why it holds:** all 5 error cases from criteria map to explicit guard lines and test cases.

---

### usecase.2: proactive suggestion after take

**criteria episode: suggestion shown**
```
given rebase in progress
  given lock file has conflicts
    when take is run
      then suggestion is shown under settled file
```

**blueprint line-by-line coverage:**

| criteria | blueprint line | description |
|----------|----------------|-------------|
| suggestion under settled file | lines 73-75 | for each settled lock file → add sub-branch |
| suggestion text | line 74 | "lock taken, refresh it with: ⚡" |
| command shown | line 75 | "rhx git.branch.rebase lock refresh" |

**test coverage:** case11 (lines 134-138)

**criteria: single suggestion for multiple files**
```
when take theirs . is run
  then suggestion shown once (not per lock file)
```

**issue found:** blueprint line 73 said "for each settled lock file" but test case12 expects "suggestion shown once". these conflicted.

**fix applied:** updated blueprint codepath tree (lines 73-77) to clarify:
- changed "for each settled lock file" → "if any settled file is a lock file"
- changed "add sub-branch" → "add suggestion once (after all settled files)"

this matches vision ("show suggestion once") and test case12.

---

**criteria episode: no suggestion**
```
given non-lock file has conflicts
  when take is run
    then no lock refresh suggestion shown
```

**blueprint coverage:** test case13 (lines 144-146) verifies no suggestion for non-lock file.

---

### usecase.3: package manager detection

**criteria detection rules:**

| lock file | pm | criteria | blueprint line | test lines |
|-----------|-----|----------|----------------|------------|
| pnpm-lock.yaml | pnpm | pnpm install | lines 47, 52, 57 | lines 85-88 (case1) |
| package-lock.json | npm | npm install | lines 48, 53, 58 | lines 90-93 (case2) |
| yarn.lock | yarn | yarn install | lines 49, 54, 59 | lines 95-98 (case3) |
| both pnpm + npm, pnpm available | pnpm | pnpm preferred | lines 171-172 (priority) | lines 120-122 (case8[t0]) |
| both pnpm + npm, pnpm not available | npm | npm fallback | line 173 (priority) | lines 123-124 (case8[t1]) |

**why it holds:** all 5 detection rules from criteria map to explicit blueprint lines and test cases.

---

## issues found and fixed

### issue 1: suggestion shown "for each" vs "once"

**problem:** blueprint line 73 said "for each settled lock file" but vision and test case12 expect suggestion shown once.

**fix:** updated codepath tree lines 73-77 to say "if any settled file is a lock file" and "add suggestion once".

**lesson:** test cases are authoritative when codepath description is ambiguous. verify codepath text matches test expectations.

---

## summary

| spec source | total items | covered | issues fixed |
|-------------|-------------|---------|--------------|
| vision usecases | 2 | 2 | 0 |
| vision contract | 5 outputs | 5 | 0 |
| vision edgecases | 7 | 7 | 0 |
| wisher decisions | 3 | 3 | 0 |
| criteria usecase.1 | 6 episodes | 6 | 0 |
| criteria usecase.2 | 3 episodes | 3 | 1 (suggestion once) |
| criteria usecase.3 | 5 rules | 5 | 0 |

**result:** 1 issue found and fixed. all requirements from vision and criteria are now covered in blueprint.


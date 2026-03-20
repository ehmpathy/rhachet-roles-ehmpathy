# self-review: has-questioned-assumptions

## deep review of hidden assumptions

i re-read 1.vision.md with fresh eyes, specifically to surface assumptions that were treated as facts.

## assumptions examined

### assumption 1: "lock refresh = pnpm/npm install"

**what we assume:** that `pnpm install` or `npm install` is the correct way to regenerate a lock file after conflict resolution.

**what evidence supports this?**
- this is how developers manually fix stale locks
- the lock file captures dependency resolution state
- install re-resolves and regenerates

**what if the opposite were true?**
- if install doesn't regenerate properly, we'd need different flags
- `pnpm install --frozen-lockfile=false` might be needed
- or `npm install --package-lock-only`

**did wisher say this?**
- no, wisher just said "refresh the lock file"
- the mechanism is inferred

**research needed:**
- what exact command produces a clean lock?
- does `pnpm install` work mid-rebase?
- do we need special flags?

**verdict:** assumption may need validation — flag for research phase ⚠️

---

### assumption 2: "stage after refresh automatically"

**what we assume:** the skill should auto-stage the lock file.

**what evidence supports this?**
- rebase continue requires staged files
- manual stage is friction
- consistent with `take` which also stages

**what if the opposite were true?**
- user might want to inspect diff first
- user might want to reject the refresh
- but: they can always `git restore` if needed

**did wisher say this?**
- no, wisher didn't mention

**verdict:** assumption holds — consistent with extant `take` behavior ✓

---

### assumption 3: "detect package manager via lock file presence"

**what we assume:** we can tell pnpm vs npm by which lock file extant.

**what evidence supports this?**
- `pnpm-lock.yaml` → pnpm
- `package-lock.json` → npm
- simple, reliable

**what if the opposite were true?**
- repo could have both (migrated)
- repo could have neither (new project)

**exceptions:**
- both extant: prefer pnpm-lock (vision says this)
- neither extant: error "no lock file found" (vision says this)

**verdict:** assumption holds — edgecases covered ✓

---

### assumption 4: "command only works in rebase"

**what we assume:** `lock refresh` should only work when rebase is in progress.

**what evidence supports this?**
- wish says "inflight rebase"
- rebase-specific context

**what if the opposite were true?**
- same problem exists after merge conflicts
- but: merge flow is different (no rebase-dir)
- detection would need different logic

**did wisher say this?**
- yes, "when theres an inflight rebase"

**verdict:** assumption holds — matches wish ✓

---

### assumption 5: "the ⚡ suggestion appears under the lock file"

**what we assume:** the suggestion should appear as a sub-branch of the settled lock file.

**what evidence supports this?**
- human (wisher) explicitly requested this format
- makes visual sense: suggestion applies to that file

**did wisher say this?**
- yes, in conversation: "it should go under the pnpm-lock.yaml file"

**verdict:** assumption holds — wisher confirmed ✓

---

### assumption 6: "95% of the time the lock file is stale"

**what we assume:** the wish's claim that locks are stale "95% of the time" is accurate.

**what evidence supports this?**
- real-world experience
- lock captures resolution state from different dependency trees
- after take, the resolution may not match current package.json

**what if the opposite were true?**
- if locks were usually valid, the feature would be low-value
- but: the CI failure pattern is well-documented

**verdict:** assumption holds — empirical observation ✓

---

### assumption 7: "pnpm detected" means pnpm-lock.yaml extant

**what we assume:** vision line 134 says "prefer pnpm-lock if pnpm detected" but never defines detection.

**what evidence supports this?**
- file presence is simple and reliable
- no need to check `pnpm --version`

**what if the opposite were true?**
- user could have pnpm-lock.yaml but pnpm not installed
- then `pnpm install` would fail
- but: this is an edgecase — if pnpm-lock extant, pnpm should be available

**counterexample:**
- CI environment might have npm but not pnpm
- file was committed by teammate who uses pnpm

**verdict:** gap found and FIXED — added to pit of success edgecases: "pnpm-lock extant but pnpm not installed → error" ✓

---

### assumption 8: "lock" subcommand is necessary

**what we assume:** the command is `git.branch.rebase lock refresh` not just `git.branch.rebase refresh`.

**what evidence supports this?**
- wish says "refresh the lock file"
- `lock` makes it explicit what we're refreshing
- could add `lock check` later (extensibility)

**what if the opposite were true?**
- `refresh` alone is shorter
- but: less clear what's refreshed
- but: `lock` namespace allows future `lock validate`, `lock diff`

**verdict:** assumption holds — `lock` namespace is intentional for extensibility ✓

---

### assumption 9: suggestion appears even when multiple lock files taken

**what we assume:** if user runs `take --whos theirs .` and multiple files include lock, suggestion shows once.

**vision doesn't specify this.**

**what evidence supports this?**
- none — not addressed

**what if multiple suggestions appeared?**
- noisy output
- confusing

**verdict:** gap found and FIXED — added to pit of success edgecases: "multiple lock files taken → show suggestion once" ✓

---

## issues found

### issue 1: install flags not researched

assumption 1 revealed we don't know the exact install command needed.

**not fixed yet** — documented in vision's "research needed" section. this is appropriate: vision identifies unknowns, implementation phase resolves them.

---

### issue 2: tree structure for timeline (FIXED)

the before/after contrast used tree structure (`└─`) to represent a linear timeline.

**problem:** trees represent hierarchy/multifractals, not sequences. `└─` for a timeline is semantically wrong — it implies parent-child relationship, not temporal order.

**fix:** changed to arrow notation (`→`) which correctly represents sequence flow:
```
rebase → conflict → take → suggestion → refresh → continue → CI passes ✓
```

**lesson:** choose notation that matches semantics. trees = hierarchy. arrows = sequence.

---

### issue 3: pnpm availability not checked (FIXED)

assumption 7 revealed that "pnpm detected" was vague — what if pnpm-lock.yaml extant but pnpm not installed?

**fix:** added to pit of success edgecases: "pnpm-lock extant but pnpm not installed → error"

---

### issue 4: multiple lock files suggestion unclear (FIXED)

assumption 9 revealed that vision didn't specify what happens when `take .` settles multiple files includelock files.

**fix:** added to pit of success edgecases: "multiple lock files taken → show suggestion once"

## why the rest hold

1. **stage after refresh**: consistent with `take` behavior
2. **detect via lock file**: simple, reliable, edgecases handled
3. **rebase-only**: matches wish explicitly
4. **⚡ format**: wisher confirmed in conversation
5. **95% stale**: empirical, matches real-world CI failures

## no other hidden assumptions found

the vision is appropriately humble about unknowns (see "research needed" section) and doesn't over-specify implementation details.

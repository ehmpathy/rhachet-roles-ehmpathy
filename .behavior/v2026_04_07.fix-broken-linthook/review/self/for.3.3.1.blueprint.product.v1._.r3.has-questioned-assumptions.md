# self-review: has-questioned-assumptions

## assumptions surfaced

### 1. lint command is `npm run test:lint`

**assumption**: the repo uses `npm run test:lint` as the lint command.

**question**: what if the repo uses pnpm, yarn, or a different command like `npm run lint`?

**evidence**: the wish says "it runs `npm run test:lint`" — this is ehmpathy convention. the vision timeline confirms "skill runs `npm run test:lint` internally".

**verdict**: assumption is valid for ehmpathy repos. if skill needs to support other repos in future, this could be parameterized. for now, scoped to ehmpathy convention.

### 2. defect count can be parsed from lint output

**assumption**: we can parse defect count from npm/eslint output.

**question**: what if eslint output format varies? what if biome or another linter is in use?

**evidence**: eslint outputs consistent summary like "X problems (Y errors, Z warnings)". this is reliable enough to count.

**verdict**: assumption is valid. if parse fails, we can still report "defects found" without exact count. graceful degradation possible.

### 3. isotime format is filesystem-safe

**assumption**: isotime like `2026-04-07T14-32-01Z` works on all filesystems.

**question**: what about Windows? colons in timestamps are not allowed.

**evidence**: the vision shows `2026-04-07T14-32-01Z` with hyphens, not colons. this is deliberate — the format replaces colons with hyphens.

**verdict**: assumption is valid. the format is explicitly designed to be filesystem-safe.

### 4. .gitignore self-ignore pattern

**assumption**: `.gitignore` with self-ignore works.

**question**: what does "self-ignore" mean exactly? ignore the directory? ignore all files?

**evidence**: teesafe research shows the pattern. self-ignore means the `.gitignore` file contains `*` to ignore all files in that directory, itself included.

**verdict**: assumption is valid. pattern is well-established in this codebase.

### 5. 60s timeout is sufficient

**assumption**: lint completes in under 60 seconds.

**question**: what if lint takes longer on large repos?

**evidence**: most repos lint in under 30 seconds. 60 seconds is 2x buffer. if lint takes longer, the hook will timeout, which is correct behavior — infinite lint is a problem to fix, not to wait for.

**verdict**: assumption is reasonable. 60 seconds is a sensible default. can be made configurable later if needed.

### 6. exit code 2 for constraint

**assumption**: exit code 2 means "constraint, human must fix".

**question**: is this consistent with other skills?

**evidence**: research pattern.6 confirms "exit codes follow documented semantics: 0=success, 1=malfunction, 2=constraint". teesafe.sh uses exit 2 for constraints. this is codebase convention.

**verdict**: assumption is valid. consistent with codebase convention.

## issues found

none. all assumptions are either:
- explicitly stated in wish/vision, or
- consistent with codebase conventions documented in research

## verdict

no hidden assumptions discovered. all technical decisions trace to evidence.

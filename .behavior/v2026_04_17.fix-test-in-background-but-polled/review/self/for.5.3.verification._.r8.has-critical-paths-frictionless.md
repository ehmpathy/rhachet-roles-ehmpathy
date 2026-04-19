# self-review r8: has-critical-paths-frictionless (clone perspective)

## from the clone's shoes

a clone wants to run tests. let me think through what happens:

### scenario A: clone runs foreground (happy path)

```
clone: Bash(command: 'rhx git.repo.test --what unit')
```

**what happens:**
1. hook fires (filter: Bash, when: before)
2. hook checks run_in_background → absent/false
3. hook exits 0 (allow)
4. command runs, clone sees curated output

**friction:** none. clone doesn't even know hook extant.

### scenario B: clone runs background (blocked path)

```
clone: Bash(command: 'rhx git.repo.test --what unit', run_in_background: true)
```

**what happens:**
1. hook fires
2. hook checks run_in_background → true
3. hook checks command → matches git.repo.test
4. hook outputs block message to stderr
5. hook exits 2 (block)
6. Claude Code shows block message to clone

**friction points to examine:**

| moment | question | answer |
|--------|----------|--------|
| block occurs | is it clear an issue occurred? | yes - 🛑 BLOCKED prefix |
| reason shown | does clone know the cause? | yes - "wastes tokens" explanation |
| fix shown | can clone act immediately? | yes - "remove run_in_background" |
| retry | is recovery easy? | yes - just re-run without flag |

### scenario C: clone runs other command in background

```
clone: Bash(command: 'npm run build', run_in_background: true)
```

**what happens:**
1. hook fires
2. hook checks command → does not match git.repo.test
3. hook exits 0 (allow)
4. command runs in background as intended

**friction:** none. hook only blocks test skill.

## what could cause friction

| potential issue | mitigated? | how |
|-----------------|------------|-----|
| clone confused by block | yes | emoji + "BLOCKED" is unambiguous |
| clone doesn't know fix | yes | "fix:" line with exact guidance |
| clone forgets and retries | yes | hook blocks every attempt |
| clone frustrated | maybe | message explains why (token savings) |

## the "frustrated clone" edge case

a clone might think "but i want to do other work while tests run!"

the message addresses this:
> "background + poll wastes tokens (2500+ vs 50 from curated output)"

this explains that background+poll is worse, not better. foreground is the efficient path.

## why it holds

1. **happy path is invisible.** no friction for foreground execution.
2. **blocked path is clear.** emoji, explanation, fix, example.
3. **recovery is immediate.** one re-run to fix.
4. **rationale is given.** clone understands why.

## gaps found

none. both paths are frictionless from the clone's perspective.

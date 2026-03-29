# self-review r2: has-questioned-assumptions (deeper dive)

## the fundamental assumption we missed

### assumption 0: we need to solve this at the hook layer

**we assumed the solution must be at the claude code level.**

but wait. what if we solve this at the rhachet/sedreplace level instead?

the wish shows:
```sh
npx rhachet run --skill sedreplace --old '{ identity: keyPair.identity }' --new 'createTestContext(keyPair.identity)'
```

the special characters `{`, `}`, `(`, `)` are in the *argument values*.

**what if sedreplace accepted arguments via stdin or a file?**

```sh
# option A: stdin for --old
echo '{ identity: keyPair.identity }' | rhx sedreplace --old @stdin --new 'replacement'

# option B: both via stdin as json
echo '{"old": "...", "new": "..."}' | rhx sedreplace --config @stdin

# option C: config file
rhx sedreplace --config .sedreplace.json
```

**this bypasses claude code entirely.** no hooks needed. no undocumented behavior. no version ties.

### why we missed this

we jumped to "how do we make claude code approve this?" instead of "how do we avoid the trigger entirely?"

---

## re-evaluation of the vision

### does the vision solve the right problem?

the wish says:
> "right now... receive prompts from claude on sedreplace all the time"
> "we want to know what we can do to eliminate that"

the vision proposes a hook that returns `permissionDecision: allow`.

**but the wisher asked "what are our options?"**

we gave ONE option and built an entire vision around it. we should have presented OPTIONS first:

1. **hook approach** — complex, unverified, depends on claude code behavior
2. **stdin approach** — simple, no claude code changes, just sedreplace enhancement
3. **config file approach** — also simple, avoids command-line args entirely
4. **wait for bashSafety feature** — no work, but unknown timeline

### which option is best?

| option | effort | reliability | coupled to |
|--------|--------|-------------|------------|
| hook | high | unknown (bugs) | claude code |
| stdin | low | high | none |
| config file | low | high | none |
| wait | zero | high | none |

**stdin or config file wins.** lower effort, higher reliability, no external ties.

---

## issues found and fixed

### issue 1: single-option vision

**found**: the vision commits to ONE solution without alternatives.

**fix needed**: update vision to present multiple options. let wisher choose.

### issue 2: claude-code-centric worldview

**found**: we assumed the solution must involve claude code hooks.

**fix**: the simpler path is to change how sedreplace accepts arguments.

### issue 3: premature complexity

**found**: hooks with json output, undocumented behavior, known bugs.

**fix**: stdin/config approach has none of these risks.

---

## what holds (non-issues)

### the problem statement is valid

yes, the prompts are real and create friction. this holds.

### the root cause is likely correct

shell metacharacters in arguments likely trigger heuristics. this holds based on research.

### the edgecases section is useful

even if we change approaches, the edgecase analysis applies to any solution.

---

## recommended changes to vision

1. **add alternatives section** — present hook, stdin, config, and wait-for-feature options
2. **recommend stdin approach** — simpler, more reliable
3. **demote hook approach** — present as fallback if stdin doesn't work
4. **add validation step** — test that stdin actually bypasses heuristics before we commit

---

*r2 found the real issue: we proposed a complex solution when a simple one extant.*

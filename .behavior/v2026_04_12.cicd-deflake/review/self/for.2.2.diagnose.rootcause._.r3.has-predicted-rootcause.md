# self-review: has-predicted-rootcause

## question

does every flake have a predicted root cause based on evidence, not speculation?

## methodology

1. opened 2.2.diagnose.rootcause.yield.md
2. searched for "### predicted root cause" sections
3. verified each prediction traces to evidence from research

## verification

### flake 1: brief.compress (lines 25-29)

**check: section exists?**
- line 25: `### predicted root cause` ✓

**check: prediction is based on evidence?**

predicted root cause: "keyrack credentials not unlocked in CI environment"

evidence chain:
1. test calls `brief.compress --via bhrain/sitrep`
2. shell invokes `compress.via.bhrain.ts`
3. ts calls `genContextBrain({ choice: { atom: 'xai/grok/code-fast-1' } })`
4. brain discovery looks up XAI_API_KEY from keyrack
5. if keyrack not unlocked → BrainChoiceNotFoundError
6. exit code 2

**is this speculation or evidence?**
- evidence: BrainChoiceNotFoundError is the exact error class in the codepath
- evidence: exit code 2 matches the observed failure
- evidence: reproduction confirmed the hypothesis (lines 19-23)

✓ prediction is grounded in evidence

### flake 2: git.release (lines 53-59)

**check: section exists?**
- line 53: `### predicted root cause` ✓

**check: prediction is based on evidence?**

predicted root cause: "counter increments per gh call, not per poll cycle"

evidence chain:
1. watch loop calls `gh pr view` → mockGh increments counter
2. watch loop calls `gh run list` → mockGh increments counter again
3. counter advances by 2 per poll cycle instead of 1
4. watch_sequence.json read at wrong index
5. timeout reached → exit code 1

**is this speculation or evidence?**
- evidence: research traced mockGh.ts and found `increment_pr_view_count()` called by both commands (line 97-100 in research)
- evidence: exit code 1 matches observed failure (timeout exit)
- not yet reproduced locally, but logic analysis is sound

✓ prediction is grounded in code analysis

## what makes these predictions evidence-based

1. **both trace to specific code paths**: the predictions identify exact functions and error conditions
2. **both match observed exit codes**: brief.compress exit 2, git.release exit 1
3. **both explain the intermittent nature**: keyrack unlock state varies by CI run; counter race depends on execution order

## what would make these speculative (and they are not)

- "probably a network issue" (no specific code path)
- "maybe a race condition somewhere" (no specific location)
- "could be CI environment differences" (no specific mechanism)

the predictions here name specific code, specific errors, specific mechanisms.

## verdict

**no issues found** — both flakes have predicted root causes grounded in evidence from code analysis

# self-review: has-ranked-hypotheses

## question

does every flake have ranked hypotheses?

## methodology

1. opened 2.2.diagnose.rootcause.yield.md
2. searched for "### root cause hypotheses" sections
3. verified each has table with rank, hypothesis, probability, evidence, verification columns

## verification

### flake 1: brief.compress (lines 5-11)

**check: table exists?**
- line 5: `### root cause hypotheses` ✓

**check: at least one hypothesis with probability and evidence?**
- line 9: rank 1, "keyrack not unlocked", probability=high, evidence present ✓
- line 10: rank 2, "API rate limit", probability=low, evidence present ✓
- line 11: rank 3, "network timeout", probability=low, evidence present ✓

**check: verification approach for each?**
- rank 1: "check CI workflow for keyrack.unlock before integration tests" ✓
- rank 2: "add rate limit error detection; check xai API response codes" ✓
- rank 3: "add timeout log; increase timeout to 180s" ✓

### flake 2: git.release (lines 35-41)

**check: table exists?**
- line 35: `### root cause hypotheses` ✓

**check: at least one hypothesis with probability and evidence?**
- line 39: rank 1, "counter double-increment", probability=high, evidence present ✓
- line 40: rank 2, "file I/O race", probability=medium, evidence present ✓
- line 41: rank 3, "sequence index mismatch", probability=low, evidence present ✓

**check: verification approach for each?**
- rank 1: "trace counter values; add log at each increment site" ✓
- rank 2: "add fsync after counter write; add read-after-write verification" ✓
- rank 3: "log sequence length vs counter at each read" ✓

## why it holds

both flakes have:
1. "### root cause hypotheses" section
2. table with required columns: rank, hypothesis, probability, evidence, verification
3. at least 3 ranked hypotheses per flake
4. probability values (high/medium/low) for each hypothesis
5. evidence from research for each hypothesis
6. concrete verification approach for each hypothesis

## verdict

**no issues found** — both flakes have properly ranked hypotheses

# self-review: has-questioned-assumptions

## assumptions examined

### 1. assumption: ci history is accessible via api

**what do we assume?** we can scrape main-branch ci runs via gh api or similar

**what evidence supports this?** github actions exposes workflow runs via `gh run list`, `gh run view`. most ci providers have apis.

**what if the opposite were true?** if ci history is inaccessible, we'd need manual flake enumeration. this would work but be tedious.

**did the wisher actually say this?** no — we inferred it. the wisher said "gather evidence from the source of truth" but didn't specify how.

**exceptions?** some ci providers may have limited history retention (e.g., 30 days). some orgs may use self-hosted ci without api.

**verdict: assumption is reasonable** — we can note "ci api access required" as a prerequisite, and fall back to manual enumeration if unavailable.

### 2. assumption: flakes are detectable by "failed-then-passed-on-retry" pattern

**what do we assume?** a flaky test is one that fails on one run but passes on a re-run of the same commit.

**what evidence supports this?** this is the classic definition of a flake.

**what if the opposite were true?** some flakes may not follow this pattern:
- test passes on main, fails on next main commit, passes on the one after
- test fails consistently under load but passes under light load
- test fails on mondays but passes on tuesdays (time-based)

**did the wisher actually say this?** the wisher said "what tests had flaked" but didn't define "flake" precisely.

**exceptions?** infrastructure flakes (e.g., npm install timeout) may look like test flakes but aren't.

**verdict: assumption needs clarification** — added to open questions in vision: "scope of flake — is it strictly passed on retry?"

### 3. assumption: 3x verification is sufficient to prove stability

**what do we assume?** three consecutive passes proves the flake is fixed.

**what evidence supports this?** 3x is a common heuristic. it balances confidence with time.

**what if the opposite were true?** rare flakes (1-in-100) would pass 3x verification but still flake eventually.

**did the wisher actually say this?** yes — the wisher explicitly said "run the build 3x in a row"

**exceptions?** high-stakes systems may need 10x or 100x verification.

**verdict: assumption is wisher-approved** — noted as configurable in vision.

### 4. assumption: reflection documents are valuable and will be read

**what do we assume?** teams will read reflection docs and apply systemic lessons.

**what evidence supports this?** incident post-mortems are a proven practice. reflection docs serve the same purpose for flakes.

**what if the opposite were true?** if no one reads them, reflection docs are waste. but even if unread, the act of write forces articulation.

**did the wisher actually say this?** yes — the wisher explicitly listed step 7 as "emit reflection document" with specific content.

**exceptions?** small teams or solo devs may not benefit from formal reflection.

**verdict: assumption is wisher-approved** — the value is in the process, not just the artifact.

### 5. assumption: all flakes can be fixed without delete the test

**what do we assume?** every flake has a fix that preserves test intent.

**what evidence supports this?** most flakes have deterministic root causes (race conditions, time-based issues, environment).

**what if the opposite were true?** some tests may be fundamentally untest-able in ci (e.g., require physical hardware, real-time constraints).

**did the wisher actually say this?** indirectly — "skip the test is not okay" implies all flakes should be fixed, not removed.

**exceptions?** obsolete tests, tests for removed features, tests that were never valid.

**verdict: assumption needs nuance** — the route should handle "this test should not exist" as a distinct outcome, but that's a separate workflow (test cleanup), not deflake.

### 6. assumption: peer-review guards can detect failhide patterns

**what do we assume?** an automated guard can detect when a repair hides failures instead of fix them.

**what evidence supports this?** the wisher references "peer-review guard to detect missed failfast or added failhides" and points to behavior route 3.3.1.

**what if the opposite were true?** subtle failhides (e.g., overly broad try-catch) may evade automated detection.

**did the wisher actually say this?** yes — explicitly.

**exceptions?** novel failhide patterns may not be in the guard's pattern library.

**verdict: assumption is wisher-approved** — we implement the guard as specified; it will catch common patterns even if not all.

### 7. assumption: the route structure (skill + stones) can support this workflow

**what do we assume?** the rhx route system supports the 7-stone structure with guards and rewind.

**what evidence supports this?** declapract.upgrade exists as prior art. the wisher said "just like we have a declapract.upgrade thought route skill".

**what if the opposite were true?** if the route system can't support rewind or guards, we'd need to redesign.

**did the wisher actually say this?** implicitly — by reference to declapract.upgrade.

**exceptions?** the cicd.deflake route may have unique requirements (e.g., ci api calls) that declapract.upgrade doesn't have.

**verdict: assumption is reasonable** — we'll validate at implementation time.

## issues found

### issue 1: "flake" definition is unclear

**what was the issue?** we assumed "failed-then-passed-on-retry" but that's not the only flake pattern.

**how it was addressed:** added to open questions in vision: "scope of flake — is it strictly passed on retry? or also sometimes fails, sometimes passes across prs?"

### issue 2: test delete is not addressed

**what was the issue?** some "flakes" may be tests that should not exist.

**how it was addressed:** clarified in vision that test delete is a separate workflow, not part of deflake. the no-skip guard enforces this boundary.

## non-issues confirmed

| assumption | why it holds |
|------------|-------------|
| ci api accessible | common pattern; fallback to manual is viable |
| 3x verification | wisher-approved; configurable for edge cases |
| reflection is valuable | wisher-approved; process has value even if artifact unread |
| guard can detect failhide | wisher-approved; catches common patterns |
| route system supports this | prior art (declapract.upgrade) validates feasibility |

## adjustments made

1. **flake definition** — flagged as open question for wisher validation
2. **test delete** — clarified as out-of-scope; separate workflow

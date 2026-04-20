# self-review: has-prod-codepath-treestruct

## question

does every flake have a prod codepath treestruct?

## methodology

1. opened 2.1.diagnose.research.yield.md (already read from prior review)
2. searched for "### prod codepath treestruct" sections
3. verified each section has proper tree format and traces from entry through all called functions

## verification

### flake 1: brief.compress (lines 23-41)

**check: section exists?**
- line 23: `### prod codepath treestruct` ✓

**check: proper tree format?**
- lines 25-41: code block with ├── └── characters
- hierarchy: shell entry → parse → validate → derive → invoke → ts module → functions
- example from file:
  ```
  brief.compress.sh
  ├── parse args: --via bhrain/sitrep → PRESS=bhrain/sitrep, BRAIN=xai/grok/code-fast-1
  ├── validate args (pass)
  ├── derive mechanism: MECH_JS=compress.via.bhrain.js
  └── invoke: node compress.via.bhrain.js ...
  ```
✓ proper format

**check: traces entry → all called functions?**
- entry: brief.compress.sh
- parse args (line 27): extracts PRESS and BRAIN from --via
- validate args (line 28): passes validation
- derive mechanism (line 29): sets MECH_JS
- invoke (line 30): calls compress.via.bhrain.js
  - compress.via.bhrain.ts (line 31)
    - parseArgs (line 32)
    - fs.readFile (line 33)
    - compressOnce (line 34)
      - genContextBrain (line 35)
        - rhachet brain discovery (line 36)
          - looks up XAI_API_KEY from keyrack (line 37) ← marked as POTENTIAL
          - throws BrainChoiceNotFoundError (line 38)
            - main().catch() → process.exit(1) (line 39)
              - shell catches exit 1, maps to exit 2 (line 40) ← marked as THIS IS THE FLAKE
✓ complete trace to root cause

### flake 2: git.release (lines 86-105)

**check: section exists?**
- line 86: `### prod codepath treestruct` ✓

**check: proper tree format?**
- lines 88-105: code block with ├── └── characters
- hierarchy: shell entry → parse → detect → infer → watch loop → mocked calls
- example from file:
  ```
  git.release.sh --watch
  ├── parse args: MODE=watch
  ├── detect branch: main
  ├── infer goal: main → prod
  └── watch loop
  ```
✓ proper format

**check: traces entry → all called functions?**
- entry: git.release.sh --watch
- parse args (line 90): sets MODE=watch
- detect branch (line 91): detects main
- infer goal (line 92): main → prod
- watch loop (line 93-104):
  - gh pr view call (lines 94-98)
    - mockGh.ts: get_pr_view_count, increment_pr_view_count, read watch_sequence.json
  - gh run list call (lines 99-100): same counter mechanism
  - check terminal condition (lines 101-103):
    - if tagWorkflows == 'passed' → exit 0
    - if tagWorkflows == 'inflight' && timeout → exit 1 ← marked as THIS IS THE FLAKE
  - sleep + retry (line 104)
✓ complete trace to root cause

## why it holds

both prod codepath treestructs:
1. exist with proper section headers
2. use standard tree characters (├── └──)
3. trace the full path from shell entry through:
   - argument parse and validation
   - function dispatch/invocation
   - nested module calls
   - the exact point where the flake occurs (marked with ← THIS IS THE FLAKE)

the flake points are clearly annotated, which enables targeted fixes.

## verdict

**no issues found** — both flakes have complete prod codepath treestructs that trace to root cause

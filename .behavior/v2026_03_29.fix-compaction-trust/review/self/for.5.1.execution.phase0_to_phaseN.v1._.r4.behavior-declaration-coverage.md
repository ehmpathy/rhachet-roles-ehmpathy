# self-review r4: behavior-declaration-coverage

## coverage check: is every requirement implemented?

### from vision (1.vision.md)

**requirement:** brief teaches verification pattern
- **vision says:** mechanic pauses, runs `rhx show.gh.test.errors`, sees actual error
- **implementation:** brief section `.the rule` (lines 23-31) lists verification methods
- **coverage:** [OK] table includes `CI diagnosis → rhx show.gh.test.errors`

**requirement:** brief establishes pattern `claim → verify → act`
- **vision says:** pattern: claim → verify → act
- **implementation:** brief section `.pattern` (lines 33-41) shows this exact pattern
- **coverage:** [OK] lines 36-41 state the three-step pattern

**requirement:** brief includes antipattern
- **vision says:** antipattern: `claim → act`
- **implementation:** brief section `.antipattern` (lines 43-54) tells orphan processes story
- **coverage:** [OK] story illustrates the failure mode

**requirement:** brief includes mantra
- **vision says:** "trust but verify — don't even trust yourself"
- **implementation:** brief section `.mantra` (lines 56-58) has exact quote
- **coverage:** [OK] line 58 contains the mantra

**requirement:** optional hook reminds after compaction
- **vision says:** hook emits nudge via PostCompact event
- **implementation:** hook `postcompact.trust-but-verify.sh` fires on PostCompact
- **coverage:** [OK] hook registered with `filter: { what: 'PostCompact' }`

---

### from criteria (2.1.criteria.blackbox.md)

**usecase.1: brief teaches verification pattern**

| criterion | brief location | verdict |
|-----------|----------------|---------|
| brief reminds: verify claims before you act | `.what` (line 5) | [OK] |
| brief provides pattern: claim → verify → act | `.pattern` (lines 33-41) | [OK] |
| brief provides antipattern: claim → act | `.antipattern` (lines 43-54) | [OK] |
| brief provides mantra | `.mantra` (lines 56-58) | [OK] |
| brief lists diagnoses ("X is the problem") | `.the rule` table (line 27) | [OK] |
| brief lists objectives ("we need to do Y") | `.the rule` table (line 31) | [OK] |
| brief lists state claims ("file contains Z") | `.the rule` table (line 28) | [OK] |
| brief lists conclusions ("the fix is W") | `.the rule` table (line 30) | [OK] |
| CI diagnosis: `rhx show.gh.test.errors` | `.the rule` table (line 27) | [OK] |
| file state: read the file | `.the rule` table (line 28) | [OK] |
| PR status: `gh pr view` | `.the rule` table (line 29) | [OK] |

**usecase.2: postcompact hook reminds at critical moment**

| criterion | hook location | verdict |
|-----------|---------------|---------|
| reminder visible before mechanic responds | PostCompact fires after compaction, before response | [OK] |
| reminder lists claim types | output lines 23-27 | [OK] |
| reminder points to brief | output line 31: `see: rule.require.trust-but-verify` | [OK] |
| hook does not fire on fresh session | filter: PostCompact (not SessionStart) | [OK] |
| reminder is concise | 11 lines of output (not verbose) | [OK] |

**usecase.3: pattern applies beyond compaction**

| criterion | brief location | verdict |
|-----------|----------------|---------|
| brief applies to mid-session conclusions | `.why` line 13: "your own memory is a summary too" | [OK] |
| brief applies to external input | `.the rule` applies to all claim types | [OK] |

**edgecases**

| criterion | brief location | verdict |
|-----------|----------------|---------|
| correct claims verify quickly | `.when verification is expensive` (lines 76-87) | [OK] |
| brief suggests cheap checks first | lines 78-81: error logs, file reads, git status | [OK] |
| brief suggests: ask human | line 87: "if no obvious verification method: ask the human" | [OK] |

---

### from blueprint (3.3.1.blueprint.product.v1.i1.md)

| component | blueprint spec | implementation | verdict |
|-----------|---------------|----------------|---------|
| brief location | `briefs/practices/work.flow/rule.require.trust-but-verify.md` | file exists at this path | [OK] |
| brief sections | .what, .why, .the rule, .pattern, .antipattern, .mantra, .enforcement | all sections present | [OK] |
| hook location | `inits/claude.hooks/postcompact.trust-but-verify.sh` | file exists at this path | [OK] |
| hook output | emit reminder to stdout, exit 0 | implemented (lines 20-34) | [OK] |
| hook registration | hooks.onBrain.onBoot with filter.what: PostCompact | getMechanicRole.ts lines 43-47 | [OK] |
| boot.yml entry | add brief to say section | line 206 added | [OK] |
| test coverage | hook integration test | 5 tests pass | [OK] |

---

## summary

| source | requirements | covered | gaps |
|--------|--------------|---------|------|
| vision | 5 | 5 | 0 |
| criteria | 18 | 18 | 0 |
| blueprint | 7 | 7 | 0 |
| **total** | **30** | **30** | **0** |

**gaps found:** 0
**issues fixed:** 0 (none required)

## what i'll remember

- trace each criterion back to a specific line in the implementation
- hook filter `{ what: 'PostCompact' }` ensures it fires only after compaction
- brief covers both compaction claims and mid-session conclusions via "your own memory is a summary too"
- `.when verification is expensive` section handles the cheap-check-first edge case

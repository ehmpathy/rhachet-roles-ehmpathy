# self-review r5: behavior-declaration-coverage

## requirement-by-requirement trace

### vision requirements traced to implementation

**vision.1:** mechanic should see verification methods

- **vision stated:** mechanic runs `rhx show.gh.test.errors`, sees actual error
- **brief line 27:** `| CI diagnosis ("X is the problem") | \`rhx show.gh.test.errors\` |`
- **brief line 64:** `rhx show.gh.test.errors` in verification examples
- **why it holds:** the exact command is documented twice — in the rule table and in examples

**vision.2:** pattern is `claim → verify → act`

- **vision stated:** pattern: claim → verify → act
- **brief line 36:** `claim → verify → act` in code block
- **brief lines 39-41:** three numbered steps expand the pattern
- **why it holds:** both visual (code block) and narrative (numbered list) representations

**vision.3:** antipattern is `claim → act`

- **vision stated:** antipattern: `claim → act`
- **brief line 46:** `claim → act` in code block
- **brief lines 49-54:** orphan processes story illustrates the failure
- **why it holds:** abstract pattern + concrete story anchors the lesson

**vision.4:** mantra is memorable

- **vision stated:** "trust but verify — don't even trust yourself"
- **brief line 58:** `> trust but verify — don't even trust yourself.`
- **why it holds:** exact quote in blockquote format for emphasis

**vision.5:** hook fires after compaction

- **vision stated:** hook emits nudge via PostCompact event
- **getMechanicRole.ts line 47:** `filter: { what: 'PostCompact' }`
- **test line 40:** `given('[case1] PostCompact event fires'`
- **why it holds:** filter ensures hook fires only on PostCompact, not other events

---

### criteria requirements traced to implementation

**criteria.usecase1.1:** brief reminds to verify claims before you act

- **criteria stated:** brief reminds: verify claims before you act
- **brief line 5:** "verify inherited claims before you act on them."
- **why it holds:** first sentence in `.what` section establishes the core message

**criteria.usecase1.2:** brief lists claim types that may be stale

- **criteria stated:** diagnoses, objectives, state claims, conclusions
- **brief lines 27-31:** table lists all four claim types
  - line 27: `CI diagnosis ("X is the problem")`
  - line 28: `file state ("file contains Y")`
  - line 29: `PR status ("PR is ready")`
  - line 30: `conclusion ("the fix is Z")`
  - line 31: `objective ("we need to do W")`
- **why it holds:** all four categories from criteria appear in rule table

**criteria.usecase1.3:** brief lists verification methods

- **criteria stated:** CI diagnosis: `rhx show.gh.test.errors`
- **brief line 27:** `| CI diagnosis | \`rhx show.gh.test.errors\` |`
- **brief line 64:** `rhx show.gh.test.errors` in examples

- **criteria stated:** file state: read the file
- **brief line 28:** `| file state | read the file |`
- **brief line 67:** `cat src/example.ts` in examples

- **criteria stated:** PR status: `gh pr view`
- **brief line 29:** `| PR status | \`gh pr view\` |`
- **brief line 70:** `gh pr view` in examples

**criteria.usecase2.1:** hook reminder visible before mechanic responds

- **criteria stated:** mechanic sees reminder before they respond
- **hook line 21:** `compaction occurred` as first output line
- **test line 44:** `expect(result.stdout).toContain('compaction occurred')`
- **why it holds:** PostCompact fires after compaction but before Claude responds

**criteria.usecase2.2:** hook lists claim types

- **criteria stated:** reminder lists claim types that may be stale
- **hook lines 24-27:**
  ```
  - diagnoses ("X is the problem")
  - objectives ("we need to do Y")
  - state claims ("file contains Z")
  - conclusions ("the fix is W")
  ```
- **test lines 46-49:** assertions for each claim type
- **why it holds:** hook output includes all four claim types from criteria

**criteria.usecase2.3:** hook points to brief

- **criteria stated:** reminder points to the brief
- **hook line 31:** `see: rule.require.trust-but-verify`
- **test line 51:** `expect(result.stdout).toContain('rule.require.trust-but-verify')`
- **why it holds:** explicit reference enables mechanic to read full brief

**criteria.usecase2.4:** hook does not fire on fresh session

- **criteria stated:** on fresh session start, hook does not fire
- **getMechanicRole.ts line 47:** `filter: { what: 'PostCompact' }`
- **why it holds:** filter excludes SessionStart; hook only fires on PostCompact

**criteria.usecase2.5:** reminder is concise

- **criteria stated:** reminder is concise, not verbose
- **hook output:** 11 lines total (lines 21-31)
- **why it holds:** under 15 lines; no lengthy explanations

**criteria.usecase3.1:** pattern applies beyond compaction

- **criteria stated:** brief applies to mid-session conclusions
- **brief line 13:** "your own memory is a summary too"
- **why it holds:** explicitly states own conclusions can also be wrong

**criteria.edgecase1:** correct claims verify quickly

- **criteria stated:** verification confirms correct claims quickly
- **brief lines 78-81:** start with cheap checks (error logs, file reads, git status)
- **why it holds:** cheap checks confirm or refute claims in seconds

**criteria.edgecase2:** brief suggests cheap checks first

- **criteria stated:** brief suggests cheap checks first
- **brief lines 78-81:**
  1. error logs first (`rhx show.gh.test.errors`)
  2. quick file reads
  3. git status checks
- **why it holds:** numbered list with "start cheap" directive

**criteria.edgecase3:** brief suggests ask human

- **criteria stated:** if no obvious verification method, ask human
- **brief line 87:** "if no obvious verification method: ask the human."
- **why it holds:** explicit escape hatch for ambiguous cases

---

### blueprint components traced to implementation

| component | blueprint spec | actual location | content verified |
|-----------|---------------|-----------------|------------------|
| brief | `.../work.flow/rule.require.trust-but-verify.md` | `src/domain.roles/mechanic/briefs/practices/work.flow/rule.require.trust-but-verify.md` | 93 lines, all sections present |
| hook | `.../claude.hooks/postcompact.trust-but-verify.sh` | `src/domain.roles/mechanic/inits/claude.hooks/postcompact.trust-but-verify.sh` | 35 lines, emits reminder, exits 0 |
| test | `.../postcompact.trust-but-verify.integration.test.ts` | collocated with hook | 95 lines, 5 tests, all pass |
| boot.yml | add brief to say section | line 206 | entry added |
| getMechanicRole.ts | hooks.onBrain.onBoot entry | lines 43-47 | PostCompact filter |

---

## summary

| source | requirements traced | coverage |
|--------|---------------------|----------|
| vision | 5/5 | 100% |
| criteria usecase1 | 7/7 | 100% |
| criteria usecase2 | 5/5 | 100% |
| criteria usecase3 | 1/1 | 100% |
| criteria edgecases | 3/3 | 100% |
| blueprint | 5/5 | 100% |

**gaps found:** 0

## what i'll remember

- trace every requirement to a specific line number in the implementation
- quote the actual content to prove coverage
- test assertions should mirror criteria (they do — test lines 44-51 cover usecase2.2)
- "your own memory is a summary too" (line 13) extends coverage beyond compaction

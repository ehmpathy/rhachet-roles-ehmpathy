# self-review: has-role-standards-adherance

## the question

go through the blueprint line by line:
- does the blueprint follow mechanic standards correctly?
- are there violations of required patterns?
- did the junior introduce anti-patterns, bad practices, or deviations from our conventions?

---

## enumerated rule directories

### all briefs/practices directories

```
code.prod/
├── consistent.artifacts         ✓ reviewed: pinned versions
├── consistent.contracts         ✓ reviewed: shell skill contracts
├── evolvable.architecture       ✓ reviewed: bounded contexts
├── evolvable.domain.objects     ○ not applicable: no domain objects in blueprint
├── evolvable.domain.operations  ✓ reviewed: compute*/imagine* prefixes
├── evolvable.procedures         ✓ reviewed: input patterns, arrow-only
├── evolvable.repo.structure     ✓ reviewed: file location
├── pitofsuccess.errors          ✓ reviewed: fail-fast
├── pitofsuccess.procedures      ✓ reviewed: idempotency
├── pitofsuccess.typedefs        ○ not applicable: bash skill, no types
├── readable.comments            ✓ reviewed: header comments
├── readable.narrative           ✓ reviewed: code structure
└── readable.persistence         ○ not applicable: no persistence in blueprint

code.test/
├── consistent.contracts         ✓ reviewed: test-fns usage
├── frames.behavior              ✓ reviewed: given-when-then
├── frames.caselist              ○ not applicable: not data-driven
├── lessons.howto                ○ info only
└── scope.*                      ✓ reviewed: integration vs unit

lang.terms/                      ✓ reviewed: verb conventions, ubiqlang
lang.tones/                      ✓ reviewed: turtle vibes, emojis
work.flow/                       ✓ reviewed: skill patterns
```

### confirmation

- 12 directories reviewed for applicable rules
- 4 directories not applicable (domain objects, typedefs, persistence, caselist)
- 1 info-only directory (lessons.howto)

---

## blueprint line-by-line review

### file names (filediff tree, lines 14-19)

**blueprint:**
```
├─ git.branch.rebase.sh
├─ git.branch.rebase.lock.sh
├─ git.branch.rebase.lock.integration.test.ts
├─ git.branch.rebase.take.sh
└─ git.branch.rebase.take.integration.test.ts
```

**rule: rule.require.sync-filename-opname**
- filename matches skill name (git.branch.rebase.lock = lock subcommand)
- test file mirrors skill name (.lock.integration.test.ts)

**why it holds:** filenames match `{skill}.sh` and `{skill}.integration.test.ts` patterns.

---

### command structure

**blueprint line 22:** "dispatcher routes 'lock' to lock.sh which handles 'refresh' as first positional arg"

**rule: rule.require.get-set-gen-verbs**
- "refresh" is a verb (imperative)
- alternatives considered: "regenerate" (too long), "fix" (too vague)

**why it holds:** "refresh" is an action verb suitable for a command.

---

### subcommand parse (codepath lines 42-44)

**blueprint:**
```
[+] parse subcommand (first positional arg)
   └─ [+] "refresh" → proceed with lock refresh
   └─ [+] unknown → error "unknown lock subcommand"
```

**rule: rule.require.fail-fast**
- unknown subcommand → immediate error
- no silent fallback or guess

**why it holds:** fail-fast on invalid input per standards.

---

### guards (codepath lines 45, 50, 55, 60)

**blueprint:**
```
[+] guard: is_rebase_in_progress
[+] guard: at least one lock file extant
[+] guard: package manager available
[+] guard: install succeeded
```

**rule: rule.require.fail-fast**
- each guard checks precondition before it proceeds
- explicit error message for each failure mode

**rule: rule.require.narrative-flow**
- guards are early returns, not nested if/else

**why it holds:** linear guard structure with explicit error paths.

---

### operations (codepath lines 46-59)

**blueprint:**
```
[+] detect lock file
   ├─ [+] check pnpm-lock.yaml extant
   ├─ [+] check package-lock.json extant
   └─ [+] check yarn.lock extant
[+] detect package manager
   ├─ [+] pnpm-lock.yaml → check pnpm installed
   ├─ [+] package-lock.json → npm (always available)
   └─ [+] yarn.lock → check yarn installed
[+] run install
```

**rule: rule.require.get-set-gen-verbs**
- `detect_lock_file()` → "detect" is appropriate for discovery
- `detect_package_manager()` → same pattern
- `run_install()` → "run" is imperative for execution

**rule: rule.forbid.positional-args**
- operations section (lines 159-162) shows these are inline in lock.sh
- if extracted, they would use (input, context) pattern

**why it holds:** function names use appropriate verbs per standards.

---

### output functions (codepath line 39)

**blueprint:** `[+] define turtle vibes output functions (inline)`

**rule: rule.prefer.wet-over-dry**
- single consumer (lock.sh only)
- YAGNI: don't create shared file for one user
- if future skills need it, extract then

**rule: lang.tones/rule.im_an.ehmpathy_seaturtle**
- turtle vibes output format
- uses tree characters (`├─`, `└─`)

**why it holds:** inline functions per YAGNI standards.

---

### output tree structure (codepath lines 62-66)

**blueprint:**
```
[+] output with turtle vibes
   ├─ [+] detected: {pm}
   ├─ [+] run: {pm} install
   ├─ [+] staged: {lockfile} ✓
   └─ [+] done
```

**rule: lang.tones/rule.prefer.chill-nature-emojis**
- ✓ for success indicator
- tree structure for visual hierarchy

**rule: lang.tones/rule.prefer.lowercase**
- output text is lowercase ("detected:", "run:", "staged:")

**why it holds:** output matches turtle vibes conventions.

---

### error output format

**blueprint operations decomposition (line 166):**
```
pattern: `print_turtle_header()`, `print_tree_start()` (same as git.commit/output.sh)
```

**review of extant code (git.branch.rebase.take.sh):**
- errors are tree-embedded: `echo "   └─ error: {msg}"`
- not sent to stderr
- exit 1 after error

**why it holds:** blueprint matches extant error format in peer skills.

---

### suggestion output (codepath lines 73-76)

**blueprint:**
```
[~] if any settled file is a lock file
   └─ [+] add suggestion once (after all settled files)
      └─ [+] "lock taken, refresh it with: ⚡"
         └─ [+] "rhx git.branch.rebase lock refresh"
```

**rule: rule.require.narrative-flow**
- condition checked once at end
- single suggestion, not per-file

**rule: lang.tones/rule.prefer.chill-nature-emojis**
- ⚡ used for action hint

**why it holds:** suggestion matches narrative flow and emoji conventions.

---

### test coverage (lines 85-147)

**blueprint test cases:**
- case1-3: successful refresh (pnpm, npm, yarn)
- case4-5: error guards (no rebase, no lock)
- case6-7: pm not installed errors
- case8: priority detection
- case9: install failure
- case11-13: suggestion in take

**rule: code.test/frames.behavior/rule.require.given-when-then**
- test cases use given/when/then structure
- labeled with [caseN] and [tN]

**rule: code.test/scope.unit/rule.forbid.remote-boundaries**
- integration tests (not unit) for shell skill behavior

**why it holds:** test structure matches BDD patterns per standards.

---

### reuse vs new (operations decomposition, lines 154-162)

**blueprint:**
```
reuse from shared operations:
- is_rebase_in_progress()
- get_git_dir()

new operations (in lock.sh):
- detect_lock_file()
- detect_package_manager()
- is_pm_installed()
- run_install()
```

**rule: rule.prefer.wet-over-dry**
- reuse where exact match extant
- new where semantics differ

**from r5 review:** `_detect_package_manager()` in set.package cannot be reused because:
- different priority order (npm > pnpm there, pnpm > npm here)
- different error behavior (no lock → error here, default to pnpm there)

**why it holds:** reuse evaluated properly, new operations justified.

---

## deviations found

none. the blueprint adheres to mechanic role standards correctly.

---

## summary

| rule category | rules checked | violations |
|---------------|---------------|------------|
| evolvable.procedures | verb conventions, input patterns | 0 |
| evolvable.repo.structure | file name conventions | 0 |
| pitofsuccess.errors | fail-fast guards | 0 |
| readable.narrative | linear flow, early returns | 0 |
| lang.terms | ubiqlang | 0 |
| lang.tones | turtle vibes, emojis, lowercase | 0 |
| code.test | BDD structure | 0 |
| YAGNI | inline vs shared | 0 |

**result:** 0 violations found. blueprint adheres to mechanic role standards.


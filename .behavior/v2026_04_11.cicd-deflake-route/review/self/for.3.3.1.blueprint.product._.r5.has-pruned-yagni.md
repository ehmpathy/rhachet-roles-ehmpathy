# self-review r5: has-pruned-yagni

## verification

reviewed blueprint for extras not prescribed. for each component, asked the YAGNI questions and articulated why it holds or why it was pruned.

---

## component-by-component YAGNI analysis

### cicd.deflake.sh (entry point)

**YAGNI questions:**
- was this explicitly requested? yes — vision shows `rhx cicd.deflake init`
- minimum viable way? yes
- added for future flexibility? no
- added "while we're here"? no
- optimized before needed? no

**why it holds:**

the skill needs an entry point. the vision explicitly shows `rhx cicd.deflake init` as the command. without an entry point, the skill cannot exist.

the subcommand dispatch pattern (init, help) matches declapract.upgrade exactly. we did not invent a new pattern — we reused what works. the alternative would be a single-purpose executable with no help command, which would violate CLI ergonomics.

could we have fewer lines? we could inline the help text and dispatch logic, but this would sacrifice readability without reducing functionality. the current structure is the minimum that provides standard CLI behavior.

**verdict**: required. any simpler and we'd sacrifice usability.

---

### cicd.deflake/init.sh (route creation)

**YAGNI questions:**
- was this explicitly requested? yes — vision shows init creates route and binds
- minimum viable way? yes
- added for future flexibility? no
- added "while we're here"? no
- optimized before needed? no

**why it holds:**

the init command must:
1. create the route directory — required, or templates have nowhere to go
2. copy template files — required, or there's no route content
3. bind the route — required, or driver doesn't know the route exists
4. emit confirmation — required, or user doesn't know it worked

each step is in the wish or vision. we did not add "pre-flight checks" or "configuration options" or "interactive mode" — all extras we could have added "while we're here".

the validation (git repo check) is defensive: if not in a git repo, the route is useless. this is not YAGNI — it's fail-fast.

**verdict**: required. each operation traces to a requirement.

---

### cicd.deflake/output.sh (turtle vibes)

**YAGNI questions:**
- was this explicitly requested? yes — vision shows turtle vibes output
- minimum viable way? debatable — could inline
- added for future flexibility? no
- added "while we're here"? no
- optimized before needed? no

**why it holds (despite being separable):**

we could inline the output functions into init.sh. we did not, because:

1. **pattern reuse**: declapract.upgrade separates output.sh. if we inline, we break the pattern, which means future readers must learn two patterns instead of one.

2. **separation of concerns**: init.sh handles route creation logic. output.sh handles output format. mixing them means changes to output format require edits to init.sh, which increases the risk of logic bugs.

3. **the functions are not speculative**: print_turtle_header, print_tree_branch, etc. — each is used in the actual output. there are no "just in case" functions.

could we have combined them? yes. would it be better? no — we'd violate separation of concerns and pattern consistency for zero gain.

**verdict**: acceptable. not the only way, but not YAGNI — it serves real requirements and follows established patterns.

---

### help subcommand

**YAGNI questions:**
- was this explicitly requested? no, not in wish
- minimum viable way? yes (~10 lines)
- added for future flexibility? no
- added "while we're here"? questionable
- optimized before needed? no

**why it holds:**

this is the closest candidate to YAGNI. the wish does not say "provide a help command". however:

1. **CLI contract**: any CLI tool should respond to `--help`. users expect it. to omit it would surprise users and violate standard ergonomics (rule.forbid.surprises).

2. **discovery**: without help, users must read source code to learn subcommands. this is friction we can avoid with 10 lines.

3. **pattern match**: declapract.upgrade has help. if we omit help, users wonder why this skill is different.

is it YAGNI? technically yes — it wasn't requested. but CLI ergonomics rules effectively require it. the cost (10 lines) is far smaller than the cost of user confusion.

**verdict**: acceptable exception. CLI contract takes precedence over strict YAGNI.

---

### 7 stones — individual analysis

each stone maps to a wish item. let me verify there are no hidden extras:

**1.evidence.stone**
- wish: "gather evidence of what tests had flaked, how often, error messages"
- blueprint: "gather evidence... test name, frequency, error messages, first/last occurrence"
- added "first/last occurrence" — is this YAGNI? no. the wish says "enumerate the full timeline". occurrence dates are timeline data.
- **verdict**: matches wish, no extras

**2.diagnosis.stone**
- wish: "diagnose rootcause for each... hypotheses ranked by probability... observability additions"
- blueprint: "root cause hypotheses ranked... verification approach... observability additions"
- **verdict**: matches wish, no extras

**3.plan.stone**
- wish: "propose a plan... steps, verification criteria, tips for future travelers"
- blueprint: "repair steps, verification criteria, tips for future travelers"
- **verdict**: exact match, no extras

**4.execution.stone**
- wish: "execute the plan, make updates, release"
- blueprint: "repairs made, changes committed, PR merged, CI passed once"
- the checklist format is a structure decision, not extra content. each item derives from "make updates" and "release".
- **verdict**: matches wish, no extras

**5.verification.stone**
- wish: "run the build 3x in a row, ensure passes 3x without flakes"
- blueprint: "verify zero flakes with 3 consecutive CI runs"
- **verdict**: exact match, no extras

**6.repairs.stone**
- wish: "itemize the repairs... true root cause, true repair, verification, does it make sense fundamentally"
- blueprint: exact same four items
- **verdict**: exact match, no extras

**7.reflection.stone**
- wish: "what were root causes, why introduced, how could we have prevented them, propose new briefs"
- blueprint: "root cause patterns, introduction vectors, prevention strategies, proposed briefs"
- **verdict**: exact match, no extras

---

### 4 guards — individual analysis

**2.diagnosis.guard**
- wish: "self-review guards that ensure every single test flagged in stone 1 is covered"
- blueprint: "has-complete-coverage — check count in evidence vs diagnosis"
- **verdict**: exact match, no extras

**3.plan.guard**
- wish: "self-review guards that guarantee we retain test intent; no skip, no accept failure"
- blueprint: "has-preserved-test-intent — blockers for skip, accepted failure, removed assertions"
- **verdict**: exact match, no extras

**4.execution.guard**
- wish: "peer-review guard to detect missed failfast or added failhides"
- blueprint: peer-review with failhide detection rules
- **verdict**: exact match, no extras

**5.verification.guard**
- wish: "if there are any flakes, set the route as rewound to stone 3"
- blueprint: "has-three-passes — if any run failed, BLOCKER, must rewind"
- **verdict**: exact match, no extras

---

### what we did NOT add (explicit omissions)

**1.evidence.guard**
- vision example output shows it in the file list
- but no requirement was specified: no enforcement criteria, no purpose stated
- the completeness check (every flake covered) belongs at diagnosis, not evidence
- **verdict**: correctly omitted. example was illustrative, not prescriptive.

**6.repairs.guard / 7.reflection.guard**
- wish does not specify guards for these stones
- no enforcement criteria were given
- **verdict**: correctly omitted. no requirement.

**fast-path for obvious flakes**
- vision lists as "potential mitigation"
- not required for v1
- **verdict**: correctly omitted. future possibility, not current requirement.

**human checkpoint option**
- vision lists as "potential mitigation"
- not required for v1
- **verdict**: correctly omitted. future possibility, not current requirement.

**configurable verification threshold**
- vision lists as "potential mitigation"
- wish says 3x, not "configurable"
- **verdict**: correctly omitted. 3x is the requirement.

---

### test coverage — is it excessive?

| test case | why needed |
|-----------|------------|
| init creates route and binds | verifies that init does its job — required for any skill |
| init output format | snapshot verifies aesthetic matches vision — rule.require.snapshots |
| help shows usage | verifies CLI contract we decided to keep |
| unknown subcommand error | verifies error path — standard test coverage |

could we have fewer tests? we could omit the snapshot test, but then we'd have no visual verification of output format. we could omit the error test, but then we'd have no coverage of the error path.

**verdict**: minimum necessary coverage. each test covers a distinct codepath.

---

## verdict

**no unpruned YAGNI detected.**

every component either:
1. traces directly to wish/vision requirements, or
2. follows established patterns (declapract.upgrade), or
3. satisfies standard CLI contracts (help subcommand)

we actively omitted:
- 1.evidence.guard (no requirement)
- 6.repairs.guard, 7.reflection.guard (no requirement)
- fast-path, human checkpoint, configurable threshold (vision marked as "potential")

the blueprint is minimum viable for the stated requirements.

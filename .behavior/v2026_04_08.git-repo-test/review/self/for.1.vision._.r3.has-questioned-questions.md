# review.self r3: has-questioned-questions

third pass. triage open questions in the vision.

for each question, i asked:
- can i answer this via logic now?
- can i answer this via extant docs or code?
- should this be answered via external research later?
- does only the wisher know?

---

## question 1: vitest support — same flags as jest?

**in vision:**
> vitest support: same flags as jest?
> - proposal: detect test runner from package.json, adapt flags accordingly

**triage:** [research]

**why research?**
- vitest documentation would tell us if `--testPathPattern` works
- vitest might use different flag names
- this is external knowledge, not in our codebase

**what to research:**
- vitest cli flags for path filter
- vitest cli flags for test name filter
- vitest snapshot update mechanism

**impact on vision:**
- if vitest uses same flags: no change needed
- if vitest uses different flags: add detection logic to skill

**for now:** implement jest support first. vitest is a future enhancement, documented in open questions.

---

## question 2: do all ehmpathy repos have test:unit commands?

**in vision:**
> do all ehmpathy repos have the `test:unit`, `test:integration` commands?

**triage:** [answered]

**why answered?**
the vision already handles this edge case in the pit of success:

> | no `test:unit` command | fail fast with helpful error |

the skill doesn't need to know in advance. it checks at runtime and fails gracefully. the error message teaches the clone what's expected.

**how the skill will handle it:**
```bash
# check if command exists in package.json
if ! npm run test:unit --if-present; then
  # command doesn't exist, fail with helpful error
  print_turtle_header "bummer dude..."
  echo "   └─ error: no 'test:unit' command in package.json"
  echo ""
  echo "ehmpathy repos use npm run test:unit, test:integration, test:acceptance"
  exit 2
fi
```

**no research needed.** the question is moot because we fail gracefully.

---

## question 3: exact keyrack unlock command for test vs prep?

**in vision:**
> what's the exact keyrack unlock command for test vs prep?

**triage:** [answered]

**why answered?**
the `howto.keyrack.[lesson].md` brief documents this clearly:

```sh
rhx keyrack unlock --owner ehmpath --env test
rhx keyrack unlock --owner ehmpath --env prep
rhx keyrack unlock --owner ehmpath --env prod
```

key points from the brief:
- **always use `--owner ehmpath`** — mechanics are ehmpaths
- `--env test` for test credentials
- `--env prep` for prep credentials
- owner is `ehmpath`, not `ehmpathy`

**for the skill:**
- integration tests → `rhx keyrack unlock --owner ehmpath --env test`
- acceptance tests → `rhx keyrack unlock --owner ehmpath --env test` (same for now)

the vision already decided: "always `test` env. if acceptance needs `prep`, that's a future enhancement."

**no research needed.** the answer is in the briefs.

---

## updated open questions section for vision

after triage, the open questions section should read:

### assumptions (unchanged)

1. repos follow `npm run test:unit`, `test:integration`, `test:acceptance` convention
2. keyrack credentials are under `ehmpath` owner, `test` env
3. jest or vitest is the test runner (not mocha, tap, etc.)
4. `RESNAP=true` triggers snapshot update

### resolved decisions (unchanged)

1. **scope semantics**: `--scope` = file path pattern only
2. **keyrack env**: always `test` env
3. **output behavior**: stream live AND capture via tee

### questions that require research [research]

1. **vitest support**: how does vitest handle `--testPathPattern`? same as jest?
   - implement jest first, add vitest support later if needed
   - research vitest docs when that enhancement is requested

### questions answered [answered]

1. **test command existence**: handled by fail-fast with helpful error
2. **keyrack unlock command**: `rhx keyrack unlock --owner ehmpath --env test`

---

## summary

| question | triage | resolution |
|----------|--------|------------|
| vitest flags | [research] | defer to future enhancement |
| test command existence | [answered] | fail-fast handles it |
| keyrack command | [answered] | documented in briefs |

all questions either answered or deferred appropriately. the vision is complete enough to proceed to implementation.

---

## lessons learned

### lesson 1: check extant briefs before you mark [research]

i almost marked the keyrack question as [research]. but the answer was already in `howto.keyrack.[lesson].md`. always check what's already documented.

### lesson 2: pit of success answers "do we need to know?"

the "do all repos have test:unit?" question felt like it needed research. but the pit of success (fail-fast with helpful error) makes the answer irrelevant. the skill handles the edge case gracefully regardless.

### lesson 3: defer vs block

vitest support is deferred, not blocked. the skill works for jest repos today. vitest is a future enhancement. this is the right call — ship value now, add more later.


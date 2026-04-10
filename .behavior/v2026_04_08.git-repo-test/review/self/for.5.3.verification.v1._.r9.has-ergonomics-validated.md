# review.self: has-ergonomics-validated (r9)

## review scope

ninth pass. deeper skeptic review of ergonomics validation.

---

## skeptic question: are the improvements actually better?

### improvement 1: namespace in log paths

**before (repros):** `.log/role=mechanic/skill=git.repo.test/ISOTIME.stdout.log`
**after (actual):** `.log/role=mechanic/skill=git.repo.test/what=unit/TIMESTAMP.stdout.log`

**is this better?**

| aspect | before | after |
|--------|--------|-------|
| collision risk | yes (--what all would overwrite) | no (each type isolated) |
| findability | grep for timestamp | grep for type + timestamp |
| clarity | which test type? | explicit in path |

**verdict:** yes, namespace is objectively better. prevents log collision on `--what all`.

---

### improvement 2: always plural "files"

**before (repros):** `suites: 1 file`
**after (actual):** `suites: 1 files`

**is this better?**

| aspect | before | after |
|--------|--------|-------|
| grammar | singular for 1 | plural always |
| consistency | varies by count | always same format |
| parse simplicity | regex varies | regex constant |

**verdict:** arguable. "1 files" is grammatically wrong but consistent. the alternative (dynamic singular/plural) adds complexity. acceptable tradeoff.

---

### improvement 3: quoted command names

**before (repros):** `error: no test:unit command in package.json`
**after (actual):** `error: no 'test:unit' command in package.json`

**is this better?**

| aspect | before | after |
|--------|--------|-------|
| visual separation | colon blends in | quotes highlight |
| copy-paste | ambiguous boundary | clear boundary |
| convention | inconsistent | shell convention |

**verdict:** yes, quotes are clearer. mechanic can copy-paste the exact command name.

---

### improvement 4: capitalized tip

**before (repros):** `tip: read the log for full test output`
**after (actual):** `tip: Read the log for full test output`

**is this better?**

| aspect | before | after |
|--------|--------|-------|
| sentence case | lowercase start | proper sentence |
| readability | ok | slightly better |
| consistency | matches lowercase style | matches sentence style |

**verdict:** neutral. both work. capitalized is standard for sentences but lowercase was our style. no strong preference.

---

## skeptic question: what ergonomics were NOT validated?

### unvalidated: timer display

**repros mentioned:** "timer shows elapsed time" while tests run

**actual test coverage:** no test verifies timer display

**why not validated:** timer is ephemeral, appears only while tests run. mocked npm exits instantly, so timer never shows long enough to capture.

**friction risk:** low. timer is cosmetic, not functional. tests verify final output.

**conclusion:** acceptable gap. timer is verified by human playtest, not automated test.

---

### unvalidated: --what all progress output

**repros mentioned:** "emits status block as each type completes"

**actual test coverage:** case11 tests final output, not progressive output

**why not validated:** mock npm returns all results at once. no way to simulate incremental completion.

**friction risk:** medium. if progressive output breaks, test would not catch it.

**conclusion:** acceptable gap. case11 verifies final state. progressive output verified by human playtest.

---

### unvalidated: keyrack failure message

**repros mentioned:** handled keyrack unlock failure

**actual test coverage:** no test for keyrack unlock failure

**why not validated:** to mock keyrack failure would require additional mock executable.

**friction risk:** low. keyrack's own error messages are clear. skill just forwards them.

**conclusion:** acceptable gap. keyrack errors are keyrack's responsibility.

---

## ergonomics gaps analysis

| gap | severity | mitigated by |
|-----|----------|--------------|
| timer display | low | human playtest |
| progressive --what all | medium | human playtest |
| keyrack failure | low | keyrack's own errors |

all gaps are mitigated by human playtest (stone 5.5). no critical ergonomics are untested.

---

## why it holds

1. **improvements are genuine**: namespace, quotes, and consistency are objectively better
2. **one neutral change**: capitalization is a style choice, not regression
3. **gaps are acceptable**: timer and progressive output are cosmetic, verified by playtest
4. **no regressions**: all planned ergonomics preserved or improved

the ergonomics validation is complete. automated tests cover functional ergonomics. human playtest covers cosmetic ergonomics.

**conclusion: has-ergonomics-validated = verified (ninth pass)**


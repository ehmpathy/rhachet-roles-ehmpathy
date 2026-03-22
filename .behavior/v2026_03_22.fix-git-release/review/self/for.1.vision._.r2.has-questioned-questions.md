# self-review: has-questioned-questions (r2)

## for: 1.vision

---

## triage of open questions in the vision

the vision document lists two questions under "questions to validate":

---

## question 1: is `--into` the right term?

**alternatives:** `--to`, `--target`

**can this be answered via logic now?**
yes.

**analysis:**
- `--into` emphasizes destination and avoids confusion with `--to` as a range
- the wisher explicitly requested: "replace `--to` with `--into`"
- `--target` is longer and less intuitive

**resolution:** [answered]
`--into` is correct per wisher request and semantic clarity.

---

## question 2: should `--apply` be the default alias?

**context:** we add it as alias for `--mode apply` for ergonomics.

**can this be answered via logic now?**
yes.

**analysis:**
- the wisher explicitly requested: "add alias `--apply` for `--mode = apply`"
- `--apply` is shorter than `--mode apply`
- aliases are additive — no contract break

**resolution:** [answered]
yes, `--apply` should be an alias per wisher request.

---

## additional questions found on re-read

reviewed the vision line-by-line for unresolved questions:

### question: what happens if release-semantic-release fails to create release PR?

**can this be answered via logic now?**
yes.

**analysis:**
the vision shows `🫧 and then...` which polls until found. if never found, timeout with hint.

**resolution:** [answered]
the vision handles this case already.

---

### question: what if multiple release PRs exist?

**can this be answered via logic now?**
yes.

**analysis:**
the vision lists this under edgecases: "multiple release PRs → ConstraintError: ambiguous"

**resolution:** [answered]
the vision handles this case already.

---

## conclusion

all open questions in the vision are now:
- [answered] via logic
- no [research] needed
- no [wisher] input needed

the "open questions & assumptions" section in the vision is complete.


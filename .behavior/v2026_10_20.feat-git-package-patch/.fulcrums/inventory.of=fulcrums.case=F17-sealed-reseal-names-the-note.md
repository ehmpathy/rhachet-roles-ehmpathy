# F17 — a commit rerun on a sealed patch with another why names the note, not "no open edit dir"

## .the fork

`[case1][t14]` reruns `commit` on a patch already sealed, with a different `--why`. the verb
refuses, exit 2, and leaves the note untouched. the question is what the refusal says.

- **A. `no open edit dir`** — the text the branch's first commit (e95f7fb4) rendered. it reports
  a mechanism (the edit dir was removed at seal) and hides the state the crew is in
- **B. `<patch> is sealed, and its note names another why or upstream`** — names the state, and
  the two fixes: edit the note by hand to correct it alone, or `begin` again to change the patch

## .taken: B

the verb is new on this branch; neither text ever shipped on main, so B changes no locked contract.
A misled: the crew did not forget to open an edit dir, they sealed and then changed their mind on
the why. a refusal must name the fix (`rule.require.errors-name-the-fix`), and A's fix (`begin`) is
only half of it — it sends a crew who wants a corrected note through a full reseal.

the scenario A once covered — a commit with no open edit dir — still holds that exact text, pinned
by `[t0.1]` (never-sealed package) and `[case2][t1.2]` (custom dir never opened). `[t14]` keeps exit
2, the `begin` hint, and the note-untouched check, and snaps the full render.

## .the same call, on the verb's other revised texts

the reviewer that raised `[t14]` also lists renders revised since e95f7fb4, each equal or stricter:
`would open edit dir: <path>` (one line where two said the same path), the `open one first` hint, the
npm refusal's `this repo locks with package-lock.json`, the paste-ready command lines with quoted
placeholders, and the `_patch_hash=<hex>` mask. the same ground holds for each: the verb is new on
this branch, so none of these texts ever shipped, and each test keeps its intent with an explicit
assertion beside the snap.

## .rework

clean: one message pair in `git.package.patch.commit.sh`, one test, one snapshot entry.

## .confidence: 90%, and why it is not higher

a reviewer reads the change as a swapped criterion and asked for the wisher's sign-off; the call on
the refusal text is the wisher's to overrule.

## .where

`src/domain.roles/mechanic/skills/git.package.patch/git.package.patch.commit.sh` (the sealed-with-
another-note branch) · `git.package.patch.integration.test.ts` `[case1][t14]`

## .verdict

open — for the fulcrum council.

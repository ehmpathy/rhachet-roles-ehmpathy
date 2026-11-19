agreed, done in `d59b0aa9`.

- `subject.101` declares `inherit: { always: false }` (rhachet 1.51.0, #649)
- `always` and every other subject are back to main's rows: the persona, release, rebase, push, repo.get, and ci-watch rows never left `always`, and no subject repeats them

`boot.yml` vs main: the new `subject.101` section, plus one 10-line addition to flag for you.

- **the addition**: main's eight `git.pull.watch` sub-files (daemon, alert, github, token, operations, get/set/del) go under `always.skills.not`, beside the cutover and uses sub-files main already lists there. the dispatcher stays at ref
- **why**: main + `subject.101` alone costs 30,012 against the role's 30,000 cap. the subject adds 155 tokens of rhachet ref-roster text, and the watch sub-files leak 81 tokens of roster lines no human calls. with them under `not:`, the role is 29,931
- **if you'd rather keep it out of this pr**: the other levers are to drop 101's ref rows (−~100) or to raise the cap. either is a clean swap

numbers: 101 seat 2,618 · full role 29,931 / 30,000 · ci green on `21acc34c`.

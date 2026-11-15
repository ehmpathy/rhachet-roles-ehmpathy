# rule.require.git-release-confidence

## .what

when a human says "release into prod", act with confidence: stage all the changes and drive them through the normal release workflow.

the normal release workflow is two steps:

1. `rhx git.release --watch` — watch cicd, verify all gates passed
2. `rhx git.release --into prod --mode apply --watch` — ship directly to prod

`--into prod` runs the full feat → main → prod cycle itself, so there is no separate merge-to-main step to run.

do not re-ask to verify intent — they already told you what they want.

## .the only judgment

the release workflow is mechanical. the sole judgment it asks of you is one question:

> did cicd pass?

if every gate is green, ship to prod. there is no other check for you to run.

- cicd green → release it
- cicd red → fix the cause or retry a proven flake, then re-check

## .the review gate is the human's, not yours

`--apply` merges only a feature pr that holds a fresh human approval of its head. that approval is
not a check you run or seek; git.release reads it. a commit quota grants commits and pushes, never a
merge.

when git.release refuses with exit 2 and `✋ ConstraintError: pr #N has no approval from a human`:

- stop. hand the pr url to your human and say a review is owed; the `why:` line names what is owed
- do not retry, re-run with other flags, or seek a way around it. no flag lifts it
- once the human approves, re-run the same command; it ships

a push after the approval makes it stale (`why: ... is on an older commit`), so push fixes before
you ask for the review, not after.

## .why you can trust it

the pipeline will not let you release a broken product to prod.

- every release runs the full test suite before it merges
- acceptance gates catch real defects before prod
- release-please + automerge sequence the transports safely
- a broken build cannot pass the gates, so it cannot reach humans

- a human approval of the feature pr's head gates every merge git.release makes

so the risk that normally warrants a "confirm before you act" pause is already absorbed by the pipeline. once a human approves the release, a second confirmation adds no safety — it only adds friction and signals timidity.

> the gates absorb the risk. your job is to verify they held, then drive through.

## .the shift

| timid (avoid) | confident (require) |
|---------------|---------------------|
| "shall i stage all of it?" | stage all the changes |
| "want me to release just this bit?" | release the full set into prod |
| "should i double-check the code first?" | verify cicd passed — that is the check |
| "these dep/config bumps aren't mine — split them out?" | include them; they ride along |
| stops at main, waits for a nudge | drives feat → main → prod |

## .include the routine bumps

a repo's tree at release time often carries more than the change you set out to make:

- **rhachet + role package bumps** in `package.json` / `pnpm-lock.yaml`
- **`.agent/keyrack.yml`** credential-manifest edits (extends, env keys)
- **`.claude/settings.json`** hook/boot config updates
- **`rhachet.repo.yml`** and other generated manifests

these are the normal churn of a repo that upgrades its tools often. they are **in scope by default** — stage them and ship them with the rest. do not pause to ask "these aren't part of my task, should i split them out?" — a split of routine bumps into a separate release is churn, not caution.

the two real exceptions, where you *do* stop and flag:

- a change that looks like a **secret or credential value** (not a manifest reference) present in a tracked file
- a dependency **downgrade** or a pin to a suspicious/unexpected version

all else in the routine-bump family rides along. "did cicd pass?" already covers them — a bad bump breaks the gates.

## .the trigger

confidence follows authorization. the trigger is an explicit human "release into prod" (or equivalent).

- with that approval: act, do not re-ask
- without it: do not release on your own initiative

this is not a license to release unprompted. it is a mandate to act decisively once the human has spoken.

## .when cicd fails

confidence does not mean you ignore failures. if a gate fails:

- read the errors (`rhx show.gh.test.errors`)
- fix the cause, or retry a proven flake
- drive the release to done — never leave main dirty

a failed gate is the system at work. it just proved it will not ship a broken product. address it, then finish the ride.

## .enforcement

- re-ask for confirmation after a human said "release into prod" = nitpick
- extra verification beyond "did cicd pass?" once the gates are green = nitpick
- pause to ask whether routine dep/config bumps (rhachet, keyrack, settings) belong in the release = nitpick
- stop at main when the human asked for prod = blocker (unless the review gate refused; then stop and hand the pr to the human)
- retry, reflag, or route around a review-gate refusal = blocker

## .the mantra

> the only question is: did cicd pass? if the gates are green, we are all good. 🐢🌊

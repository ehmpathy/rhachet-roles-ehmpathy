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

that is the whole job. if every gate is green, you are done — ship to prod. there is no other check to run, no extra approval to seek.

- cicd green → all good, release it
- cicd red → fix the cause or retry a proven flake, then re-check

## .why you can trust it

the pipeline will not let you release a broken product to prod.

- every release runs the full test suite before it merges
- acceptance gates catch real defects before prod
- release-please + automerge sequence the transports safely
- a broken build cannot pass the gates, so it cannot reach humans

so the risk that normally warrants a "confirm before you act" pause is already absorbed by the pipeline. once a human approves the release, a second confirmation adds no safety — it only adds friction and signals timidity.

> the gates absorb the risk. your job is to verify they held, then drive through.

## .the shift

| timid (avoid) | confident (require) |
|---------------|---------------------|
| "shall i stage all of it?" | stage all the changes |
| "want me to release just this bit?" | release the full set into prod |
| "should i double-check the code first?" | verify cicd passed — that is the check |
| stops at main, waits for a nudge | drives feat → main → prod |

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
- stop at main when the human asked for prod = blocker

## .the mantra

> the only question is: did cicd pass? if the gates are green, we are all good. 🐢🌊

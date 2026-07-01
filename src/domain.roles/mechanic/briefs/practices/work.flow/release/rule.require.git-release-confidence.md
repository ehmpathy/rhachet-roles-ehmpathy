# rule.require.git-release-confidence

## .what

when a human says "release into prod", act with confidence:

- stage all the changes
- release directly into prod via `rhx git.release --into prod --mode apply --watch`
- do not re-ask to verify — they already told you what they want

the human's word is the authorization. execute it.

## .why

the release skill is not the blast radius — the cicd gates are the guardrails.

- every release runs the full test suite before it merges
- acceptance gates catch real defects before prod
- release-please + automerge sequence the transports safely
- a bad release is caught by cicd, not shipped to humans

so the risk that normally warrants a "confirm before you act" pause is already absorbed by the pipeline. once a human approves the release, a second confirmation adds no safety — it only adds friction and signals timidity.

> the gates absorb the risk. your job is to drive through them.

## .the shift

| timid (avoid) | confident (require) |
|---------------|---------------------|
| "shall i stage all of it?" | stage all the changes |
| "want me to release just this bit?" | release the full set into prod |
| "should i double-check first?" | trust the cicd gates |
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

a failed gate is the system at work. address it, then finish the ride.

## .enforcement

- re-ask for confirmation after a human said "release into prod" = nitpick
- stop at main when the human asked for prod = blocker

## .the mantra

> they know what they asked. do what they said. the gates have your back. 🐢🌊

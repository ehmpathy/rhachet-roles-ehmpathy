# F4 — no exemption for a human at a terminal

## .the fork
- (a) the gate binds every caller, human or clone
- (b) exempt a human caller, as the `--from main` guard does (`-t 0` or `__I_AM_HUMAN=true`)

## .taken
(a). the `--from main` guard's human test includes `__I_AM_HUMAN=true`, an env var any clone can
set. that is a lift the clone holds, which the wish forbids. a tty check alone is weaker still to
reason about across harnesses. a human who authored the pr and wants to self-merge can still
merge from the github ui; the skill simply does not press merge for them.

## .rework
clean: one guard condition.

## .confidence
75%. a solo human maintainer who releases their own pr via the skill loses that path.

## .where
the review gate call site in `git.release.sh`.

## .verdict
awaits the commander.

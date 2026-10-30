# F5: where `git.crew.grant` lives, and who runs it

## .the fork
the vision assumed `git.crew.grant` would ship in rhachet-roles-bhuild, and left unsaid who runs it.

## .taken
the director's correction: it is a director skill in `uladkasach/nheuron`, `role=director`. a driver
cannot run it. the refusal tells the driver to ask its director, and names the command the director
runs.

evidence: nheuron decision logs record the verb as `role=director/skills/git.crew.grant.sh`, with
flags `--tree <t> --quota N --push allow|block --stage allow|block --why`, typed into the crew's
bare-shell seat (`src/stream/2026.Q4/2026-10-13.experiment=director-foreman.declapract.decisions.md:968`,
`:1121-1134`, `:1233`). no `git.crew.grant.sh` file is on nheuron's origin/main, so the flags are
read from logs, not source.

## .rework
clean: the vision's text changes; no code exists yet.

## .risk
medium. the refusal prints a command that lives in another repo, read from logs, not source. if
nheuron renames a flag, the printed line goes stale with no test in this repo to catch it. the
`--why` flag is required by the verb, so the printed line must carry it or the director's run
refuses.

## .where
`1.vision.yield.md` assumptions + groundwork; every case's printed command.

## .verdict
director, 2026-10-30: correction accepted. a director skill in uladkasach/nheuron role=director; a
driver cannot run it; the refusal tells the driver to ask its director and names the command the
director runs.

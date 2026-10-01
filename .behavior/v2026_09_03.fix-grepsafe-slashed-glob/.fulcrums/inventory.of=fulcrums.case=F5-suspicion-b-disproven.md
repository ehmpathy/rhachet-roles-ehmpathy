# F5 · suspicion (b) is disproven — measured on one box only

- **rework**: clean
- **status**: open, best-guessed
- **confidence**: 90%

## .the claim

the wish carries an unverified suspicion:

> *"that arm passes an ABSOLUTE search root, which the reporter suspected also breaks relative
> globs... treat it as a suspicion. someone with `rg` truly on PATH should check it, and this round
> is that party."*

**disproven.** `rg` anchors `--glob` at cwd, not at the search root, so an absolute root cannot break
a relative glob.

## .the evidence

`rg` at `/usr/bin/rg`, verified under bash. the decisive pair, from
`1.vision.experience.case=3.rg-slashed-glob-holds.md`:

| run | command | result |
|-----|---------|--------|
| 5 | `--path src --glob 'src/**/*.sh'` | finds the file |
| 6 | `--path src --glob 'domain.roles/**/*.sh'` | finds none |

the root was `<abs>/src`; the glob that matched was written from cwd. so the anchor is cwd, and the
`rg` arm already met acceptance 1.

## .why it is a fulcrum

a negative claim that sets the round's scope, on n=1 where it matters:

- one box, one OS, one `rg` version (unrecorded)
- one glob family (`prefix/**/*.ext`); no `/` prefix, `!` negation, or brace expansion tested
- `rg`'s glob anchor is documented, but it has moved across major versions

## .confidence — 90%

the 10% is the n=1 box, not the logic. the hedge: the `engine:` line names who spoke, so a future
disagreement starts from a known engine.

settle it by: record `rg --version`; keep case=3 `[t2]` as a live assertion.

## .where

- `1.vision.experience.case=3.rg-slashed-glob-holds.md`
- `1.vision.yield.md`

## .verdict

_open — awaits the fulcrum council._

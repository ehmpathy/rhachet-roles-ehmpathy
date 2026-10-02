# F13 — the effective search root had two producers

- **rework**: clean (code) · dirty (round scope)
- **status**: 🔴 settled — the extraction landed. my deferral reversed, by me
- **confidence**: 65% → self-reversed
- **raised**: by peer lane `r003`; re-raised by `r004`, `r006`, `r011`, `r010`
- **where**: `grepsafe.sh` — `derive_search_root`

## .the fork

one fact — the directory `rg` walks — had two producers, the second a mutation of the first:

```sh
SEARCH_PATH_ABS=$(realpath "$SEARCH_PATH" 2>/dev/null || echo "")   # the --path root
...
SEARCH_PATH_ABS="$PREFIX_ABS"   # the glob-prefix branch overwrites it
RG_GLOB="$GLOB_TAIL"
NAMED_PATH=true
```

| keep the mutation | extract one producer |
|---|---|
| both writes precede every read; validation runs after both | one function returns `{root, tail, named}` once |
| six clamps pin the behavior end to end | the three values move together by construction, not discipline |
| the wish forbids a redesign | every glob-anchor question in the file takes a re-read |

## .my first call, and why it lost

keep the mutation: no nameable shipped harm, clamps observe the write order, and a restructure of path
resolution reads as the redesign the wish bans.

the entry's own confidence paragraph conceded it stood on the side
`rule.always.fix-forward-under-scouts-honor` warns about: a deferral that is locally cheaper every
time. four rubrics re-raised the same diagnosis across five rounds. `r011` traced the file and wrote:
*"the extraction is low-risk (pure move, regression net already exists) and the repeated re-raise
costs more than the extraction would."*

## .the verdict

**landed.** `derive_search_root(search_path, glob)` is the sole writer of `SEARCH_ROOT`, `RG_GLOB`, and
`NAMED_PATH`. `SEARCH_PATH_ABS` is renamed `SEARCH_ROOT`. one fact, one name, one writer.

proof it is pure: 108/108 green, no snapshot moved. the anchor clamps (`case28` `[t0]`–`[t3]`,
`case30` `[t0]`–`[t3]`, `case33` `[t0]`/`[t1]`, `case34`) observe the resolution end to end.

## .what the repair found

the deferred design said to validate after the derivation. that misreports: with one deferred gate,
`--path /tmp --glob 'sub/*.ts'` refuses with `named by: --glob` — true refusal, false attribution. so
each root is gated at the moment it becomes the root. `[case11][t3]` pins it: swap the label to
`--glob` and `[t0]`, `[t2]`, `[t3]` go red.

five rounds of re-diagnosis missed that defect; one round of repair found it.

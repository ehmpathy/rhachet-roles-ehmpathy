# F9 — the flag-value shift stays inline in each parser

## .the fork

a reviewer (mech-decode-friction, i001 nitpick.2) asked that the repeated
`shift $(( $# > 1 ? 2 : 1 ))` move into a named helper.

- **A** — a helper that shifts
- **B** — keep the one expression inline, with its intent named once per parser

## .taken: B, and why at the time

a bash function cannot shift its caller's positional args; `shift` inside a function moves only the
function's own `$@`. a helper could only return a count for the caller to `shift` by, which keeps the
same arithmetic at each site and adds a subshell. each parser carries a `.note` that names why the
shift is guarded.

## .rework: clean

a pure rename at three sites, if a cleaner bash idiom turns up.

## .confidence: 90%, and why it is low

it is a fact of bash; the only doubt is whether a reader still finds the expression opaque.

## .where

- `git.package.patch.sh`, `git.package.patch.begin.sh`, `git.package.patch.commit.sh` — the parsers

## .verdict

open

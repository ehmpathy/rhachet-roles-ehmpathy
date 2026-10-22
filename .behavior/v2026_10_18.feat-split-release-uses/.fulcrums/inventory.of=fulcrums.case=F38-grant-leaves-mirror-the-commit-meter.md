# F38 — the release grant confirmations mirror the commit meter's, leaf for leaf

## .the fork

5.3 i002 r6 (snapshot-blemishes) permissions nitpick.2: `git.release.uses` confirms a grant
three ways — `ehmpathy: allowed`, `releases: 1`, `releases blocked globally`.

- **A (taken)** — keep each leaf as `git.commit.uses` renders the same level
- **B** — one `level: state` shape for all three levels, on the release meter alone
- **C** — B on both meters

## .taken, and why

A. each shape names its level's own datum: the org grant is keyed by org name, the local grant
is a count, the global switch is an event. measured: `git.commit.uses` renders `ehmpathy:
allowed`, `commits blocked globally`, `commits resumed globally` — the release meter matches it
line for line. B splits the two meters' vocabulary, which the wish keeps parallel. C reshapes the
commit meter's contract, outside this route.

## .rework

clean — three echo lines per meter and their snapshots.

## .confidence

75% — a reader may still want one shape.

## .where

`src/domain.roles/mechanic/skills/git.release/git.release.uses*.sh`, and the same leaves in
`git.commit/git.commit.uses*.sh`.

## .verdict

overtaken in part — 5.3 i004 r11 nitpick.5 raised the local leaf again. the commit meter's local
leaf reads `granted: 3`, so `releases: 1` mirrored no leaf of it. the release write now reads as
its own `get` reads: `local: 1 left`, `local: unlimited`, `local: revoked`, and the root names
the args (`git.release.uses set --quant 1`). the org and global leaves still mirror the commit
meter, as A took them.

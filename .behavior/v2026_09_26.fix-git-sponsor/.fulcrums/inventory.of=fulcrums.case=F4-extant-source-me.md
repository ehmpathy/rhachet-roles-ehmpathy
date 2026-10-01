# F4 — sponsor files already written with `source: me`

- fork: render as-is · map `me` → `self` on read
- taken, at first: render as-is (a per-worktree file, short-lived; the reader accepts any string)
- revised in review 5: **map on read**. the wisher's later verdict on F3 — "we shouldnt even mention
  that @me works anywhere" — covers `get`'s `source: me` leaf, which names the hidden form on a
  surface a human reads. the map is one line in the shared reader (`read_sponsor_state`,
  `git.commit.operations.sh:1124-1126`), so `get` and `git.commit.set` inherit it together.
- rework: clean
- confidence: 85%
- where: `1.vision.yield.md` Q3
- verdict: awaited

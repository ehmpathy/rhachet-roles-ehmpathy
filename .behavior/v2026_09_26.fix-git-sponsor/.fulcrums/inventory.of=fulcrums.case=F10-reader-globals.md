# F10 — the git identity reader hands its result over as named globals

- fork: `GIT_IDENTITY_*` globals, read by the render leaves · explicit named args into each leaf
- raised by: peer `arch-opport-decomposition` round 1, nitpick.1 (hidden-state dependency)
- taken: globals. it is the extant reader contract of this file: `read_sponsor_state` sets
  `SPONSOR_*`, `get_org_from_keyrack` sets `ORG_VALUE`, and every caller reads them. a bash
  function cannot return a record; the alternatives are a `$( )` capture, which loses the exit
  (the reason `guard_self_identity` runs in the main flow), or a serialized string, which is the
  decode friction round 1 also flagged. the globals are documented in the reader's header, one
  place.
- the part conceded: the render leaves' `.what` headers now name which globals they read.
- rework: clean
- confidence: 85%
- where: `get_one_git_config_identity` and its readers
- verdict: held by the architect lane (enroll-impl-arch-defects, i005): the globals stay. its
  follow-on is adopted — `assert_git_identity_read` exits 1 as a named malfunction where a leaf
  reads the globals before the reader ran (never a raw `set -u` crash); clamp operations `[case39]`.

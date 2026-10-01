# F13 — the unbound `get` render lives in operations, with one caller

- fork: keep the render inline in `git.commit.sponsor.sh` · lift it to `git.commit.operations.sh`
- raised by: peer `arch-opport-decomposition` round 3, nitpick.2 (wet-over-dry: one caller)
- taken: lift it. the lift answers a TEST need, not a reuse: its `unreadable` arm cannot be reached
  through the skill (an unparseable git config fails the skill's own `git rev-parse` first), and
  peer `ergo-friction-hazards` round 2 blocked on that arm with no test. a skill executable runs
  on source, so its inline arms cannot be called alone; a leaf in operations can, and `[case36]`
  clamps each arm (`[t1c]`, `[t1d]`, `[t1e]`). the leaf's header records this reason.
- the cost accepted: one single-caller render in the shared file. it is `get`'s own render, named
  for its one surface.
- rework: clean (inline it back, and the `[case36]` clamps move to whatever can call it)
- confidence: 85%
- where: `print_sponsor_unbound_state`
- verdict: closed by the architect lane (enroll-impl-arch-defects, i005): decomposition for a
  verification need is a force distinct from reuse-driven lift; no action.

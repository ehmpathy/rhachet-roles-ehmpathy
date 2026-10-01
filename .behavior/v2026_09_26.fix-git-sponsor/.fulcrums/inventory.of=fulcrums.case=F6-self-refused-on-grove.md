# F6 — how `@self` tells the clone's machine from a human's

- fork: detect the host's owner (via gh) · define it by the git config
- taken, at first: detect via gh, refuse on a detected clone host even with a human git config
- verdict (wisher, 2026-09-26): **define it by git config.** "yes, refuse on clones machine. clone
  machine vs human machine = is the git.config a clone or human". git config names a roster
  identity → the clone's machine → refuse (case=3). git config names a human → a human's machine →
  bind (case=1).
- rework: clean — the roster check (`is_identity_robot`) already exists
- where: `case=3`, dimensions "why the grove is not an axis any more"

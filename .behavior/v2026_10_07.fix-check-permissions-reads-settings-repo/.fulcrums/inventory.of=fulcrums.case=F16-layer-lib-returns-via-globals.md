# F16 — the layer lib returns through named globals, not namerefs

- **fork**: (a) `set_permissions_layers` fills documented `PERMISSIONS_LAYER_*` globals, reset on
  each call · (b) split into a per-file reader plus a union step, each result returned by nameref
- **taken**: (a). the lib serves three hooks, each a short executable that calls it once per key
  and reads the result in place; the `.note` on the function states the reset contract. the state
  line (`<path>: N Bash allow rules`) is the one form all three hooks print, so one render in the
  lib keeps the three surfaces identical. the index-paired fault arrays avoid a delimiter that a
  legal path char could collide with. (b) is a cleaner shape, and fits better once a fourth caller
  or a second call per key appears; today it would move tested behavior with no shipped harm to
  repair
- **rework**: clean — the lib is one file with three callers and its own direct suite
  (`permissions.layers.operations.integration.test.ts`); a nameref split changes the lib and three
  call sites
- **confidence**: 85%
- **where**: peer review r011 (enroll-impl-arch-defects) i004 nitpick.2
- **verdict**: —

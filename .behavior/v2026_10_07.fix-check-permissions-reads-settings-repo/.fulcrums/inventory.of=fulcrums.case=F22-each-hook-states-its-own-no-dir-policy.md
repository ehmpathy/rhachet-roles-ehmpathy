# F22 — each hook keeps its own no-dir policy; the dir getters stay as test views

- **fork**: (a) `set_permissions_dirs` sets globals and returns 0; each hook reads the empty config
  dir and acts by its own policy · (b) `set_permissions_dirs` returns nonzero when no dir is
  found, and each hook branches on that status
- **taken**: (a). the three policies differ on purpose, and each already sits in one line beside
  its read: check exits 0 (no allowlist exists to nudge from, so claude prompts as normal), notify
  exits silently (no list to boot), decide warns and lifts (an empty allow set approves naught).
  a nonzero status would put a second exit path into every caller of the lib (getters, layer
  files, layers), each of which reads an empty dir as "skip this layer" today
- **the getters**: `get_permissions_{walkup,config,user}_dir` and `get_all_permissions_layer_files`
  are thin views over the globals. they let the lib suite pin the dir rule through stdout, one
  case per edge, without a hook in the loop. their cost is four short functions in a lib the
  hooks source once per call
- **rework**: clean — a return status and three caller lines; no contract outside the lib
- **confidence**: 85%
- **where**: peer review r011 (enroll-impl-arch-defects) i006 item 6
- **verdict**: —

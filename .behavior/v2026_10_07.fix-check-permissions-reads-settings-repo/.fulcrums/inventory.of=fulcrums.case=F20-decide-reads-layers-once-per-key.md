# F20 — decide reads the layers once per key, not once for both keys

- **fork**: (a) decide calls `set_permissions_layers` once for allow and once for deny, each a
  pass over the layer files · (b) one `jq` per file emits both keys; a separate step unions each
- **taken**: (a). decide runs at the PermissionRequest prompt, which fires only when claude would
  ask a human, never on every Bash call. its cost is up to ten `jq` forks on a rare path, against
  check's ratcheted nine on the hot path. a corrupt file warns twice, but the two warns name the
  `allow` and `deny` lists apart, and each states what that list lost. (b) changes the lib's
  output shape and all three callers for a cost no human waits on
- **rework**: clean — the lib and decide's one read site; the lib suite pins the output
- **confidence**: 80%
- **where**: `permissionrequest.decide-permissions.sh` `load_patterns`; peer r011 i005 item 3
- **verdict**: —

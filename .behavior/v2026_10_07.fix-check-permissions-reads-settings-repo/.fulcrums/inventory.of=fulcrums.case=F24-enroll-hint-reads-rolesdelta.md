# F24 — the re-enroll hint reads a delta actor's roles from `rolesDelta`

- **fork**: (a) read `rolesDelta` when a non-empty list, else `roles`, from `<actor dir>/actor.json`; the repo actor (`actor.via.repo=*`) gets a bare `rhx enroll <brain>` · (b) read `roles` only, which names a delta actor's base set and would re-enroll it as absolute · (c) print a generic `rhx enroll <brain> --roles <roles>` always
- **taken**: (a). the clone sees a command it can run as-is, and a delta actor stays a delta. (c) is the fallback when `actor.json` is absent or holds no brain
- **rework**: clean — one function, `set_permissions_enroll_cmd`; tests `permissions.layers.operations` `[case11][t0..t8]`
- **confidence**: 95%. confirmed by the rhachet clone from `vlad/fix-config-blend` (`findsertActorOndisk.ts:76`, `asActorRolesDelta.ts`, `getActorOndiskManifest.ts:71`, `getBrainOndiskDir.ts`): the key is `rolesDelta`, a sorted list of `+role`/`-role` tokens, `null` (or absent) on an absolute actor; the brain dir is always `<actorDir>/brain/.claude`. their two additions are in: a bare enroll for the repo actor, and a real path taken before the suffix strip
- **where**: `permissions.layers.operations.sh` `set_permissions_enroll_cmd`; fix hint in check, decide, notify
- **verdict**: confirmed by rhachet, 2026-10-12

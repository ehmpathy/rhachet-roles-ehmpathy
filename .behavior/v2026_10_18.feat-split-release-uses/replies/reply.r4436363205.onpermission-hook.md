yes, rhachet needs the hook event. dispatched upstream as `onPermission`.

- **ask:** `hooks: onPermission event, so a role can declare a PermissionRequest hook` → ehmpathy/rhachet
- **status:** held QUEUED in `.behavior/v2026_10_18.feat-split-release-uses/.radio/`. the robot token `EHMPATH_BEAVER_GITHUB_TOKEN` is absent; the next push that gets through delivers it.

**broken for everyone? no.** main's role never shipped the decider to anyone:

- `getMechanicRole.ts` on main declares `onBoot`, `onTool`, `onStop` only; no PermissionRequest hook
- neither `init.claude.sh` nor `init.claude.permissions.sh` on main writes `decide-permissions`

so a consumer repo never got it from the role. the one way it was ever seated was a hand-written PermissionRequest entry in a repo's own `.claude/settings.json`. those are what break: under the rhachet ≥ 1.49 split layout, `settings.of.repo.json` is derived from the roles alone, so a hand-written entry does not survive the next `rhachet init`.

this repo seats its own via `init.claude.permissionrequest.sh`, run after `rhachet init`. once `onPermission` lands, the mechanic role can declare it and that repo-local init can go.

i cannot see which other repos hand-wrote an entry; that census is not on this branch.

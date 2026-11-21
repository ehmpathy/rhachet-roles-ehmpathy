# howto: use git.package.patch

## .what

`git.package.patch` patches a dependency inside this tree, through one pre-approved verb. it
wraps `pnpm patch` + `pnpm patch-commit`, and it writes a LOCAL PATCH note beside the patch:
who, when, why, and where the upstream fix is queued.

reach for it, never raw `pnpm patch`. a raw call is a novel shell command the harness must judge
fresh; the verb is pre-approved.

| subcommand | does |
|---|---|
| `set` | open an edit dir; with `--why` + `--upstream`, seal it into a patch + note |
| `get` | each patch: apply state, entry, why, upstream, who, and the repair if stale |
| `del --package <name>[@<version>]` | retire a patch: its entry, file, and note; reinstall the pristine copy |

## .the flow

1. **set, to open** — no `--why`: open an edit dir for the dependency, inside the tree
2. **edit** — change the files under the edit dir it names
3. **set, to seal** — with `--why` + `--upstream`: seal the edits into
   `patches/<name>@<version>.patch` + its note

```bash
rhx git.package.patch set --package is-number --mode apply
# edit the files under node_modules/.pnpm_patches/is-number@7.0.0/
echo 'treat a numeric string with whitespace as not a number' \
  | rhx git.package.patch set --package is-number --why @stdin \
      --upstream https://github.com/jonschlinkert/is-number/issues/42 --mode apply
```

then stage every file the seal lists: the patch, the note, the manifest entry, the lockfile.

## .the rules it holds

- plan first: each phase previews by default; `--mode apply` acts
- `--why` and `--upstream` (an issue link) are both required to seal; pipe a long why via
  `--why @stdin`
- the edit dir stays inside the tree, never the live install, the patches dir, or the shared store
- several installed versions: name one, `--package <name>@<version>`
- a rerun is safe: the same seal over a sealed patch is a no-op; a lost manifest or lockfile record
  is refused with the restore step named
- the seal sets `allowUnusedPatches: true` + `ignorePatchFailures: true` in `pnpm-workspace.yaml`,
  so an upgrade past the patched version lands; the stale patch then surfaces via `get`
- the open lays any committed patch onto a pristine copy, so a new edit stacks on the old one and
  the reseal keeps both

## .gated packages — a human's grant

rhachet and its roles (`rhachet`, `rhachet-roles-bhrain`, `rhachet-roles-bhuild`,
`rhachet-roles-ehmpathy`) grade and gate this tree. a clone that patched them could soften the very
guard that judges it, so `set` refuses them.

- the first cure is upstream: `rhx radio.task.push --into ehmpathy/<name>`, where its own review
  judges the fix
- or a human admits one, at their own terminal; the grant names the package, never a version:

```bash
rhx git.package.patch.uses allow --package rhachet --why 'hold the stop hook quiet until rhachet#580 ships'
rhx git.package.patch.uses get
rhx git.package.patch.uses block --package rhachet   # once the upstream fix ships
```

the grant lives in `.meter/git.package.patch.uses.jsonc` (gitignored). allow and block refuse a
clone; get is open. `get` and `del` read every patch, gated or not.

## .get always checks

every `get` trial-applies each patch against the installed tree, and exits 2 when a repair is owed.

states: `applied` · `unapplied` (run `pnpm install`) · `underapplied` (the version moved, or a hunk
no longer fits: re-open on the new version, or `del` if upstream fixed it) · `obsolete` (the
installed version already holds the change: `del`) · `unused` · `unbacked` · `unrecorded`.

the mechanic's onStop hook runs `get --when hook.onStop`: silent while every patch applies, a nudge
with the repair commands when one does not. it never blocks the stop.

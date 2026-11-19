# howto: use git.package.patch

## .what

`git.package.patch` patches a dependency inside this tree, through one pre-approved verb. it
wraps `pnpm patch` + `pnpm patch-commit`, and it writes a LOCAL PATCH note beside the patch:
who, when, why, and where the upstream fix is queued.

reach for it, never raw `pnpm patch`. a raw call is a novel shell command the harness must judge
fresh; the verb is pre-approved.

## .the flow

1. **begin** — open an edit dir for the dependency, inside the tree
2. **edit** — change the files under the edit dir it names
3. **commit** — seal the edits into `patches/<name>@<version>.patch` + its note

```bash
rhx git.package.patch begin --package is-number --mode apply
# edit the files under node_modules/.pnpm_patches/is-number@7.0.0/
echo 'treat a numeric string with whitespace as not a number' \
  | rhx git.package.patch commit --package is-number --why @stdin \
      --upstream https://github.com/jonschlinkert/is-number/issues/42 --mode apply
```

then stage every file the commit lists: the patch, the note, the manifest entry, the lockfile.

## .the rules it holds

- plan first: each phase previews by default; `--mode apply` acts
- `--why` and `--upstream` (an issue link) are required; pipe a long why via `--why @stdin`
- the edit dir stays inside the tree, never the live install, the patches dir, or the shared store
- several installed versions: name one, `--package <name>@<version>`
- a rerun is safe: the same commit over a sealed patch is a no-op; a lost manifest or lockfile
  record is refused with the restore step named
- commit sets `allowUnusedPatches: true` + `ignorePatchFailures: true` in `pnpm-workspace.yaml`,
  so an upgrade past the patched version lands; the stale patch then surfaces via `check`

## .the lifecycle after the seal

| subcommand | does |
|---|---|
| `get` | list each patch: package, entry, apply state, why, upstream |
| `check` | name each patch that no longer applies, and its repair; exit 2 if any |
| `del --package <name>[@<version>]` | retire a patch: its entry, file, and note; reinstall the pristine copy |

`check` states: `applied` · `unapplied` (run `pnpm install`) · `underapplied` (the version moved,
or a hunk no longer fits: re-open on the new version, or `del` if upstream fixed it) · `obsolete`
(the installed version already holds the change: `del`) · `unused` · `unbacked` · `unrecorded`.

the mechanic's onStop hook runs `check --when hook.onStop`: silent while every patch applies, a
nudge with the repair commands when one does not. it never blocks the stop.

# seed S2 — set, get, del; get always checks

## .said

> why so complicated? why not just set, get, del
>
> get can also always check

## .settled

- the patch verb holds three subcommands: set, get, del
- open and seal are one verb, set; the seal flags (`--why`, `--upstream`) part the two phases
- get always checks: every read trial-applies each patch and names the repair for a stale one

## .landed

- `src/domain.roles/mechanic/skills/git.package.patch/git.package.patch.sh`
- `src/domain.roles/mechanic/skills/git.package.patch/git.package.patch.set.sh`
- `src/domain.roles/mechanic/skills/git.package.patch/git.package.patch.set.open.sh`
- `src/domain.roles/mechanic/skills/git.package.patch/git.package.patch.set.seal.sh`
- `src/domain.roles/mechanic/skills/git.package.patch/git.package.patch.get.sh`

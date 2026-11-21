# pr #1020 — proposed body

the bot cannot edit the pr body (`gh pr edit` is unpaved for it). a human runs:

```sh
gh pr edit 1020 --body-file .behavior/v2026_10_20.feat-git-package-patch/appendix/pr.1020.body.md
```

and, at merge, strips `closes #772` from the squash message — commit e95f7fb4 carries it, and a
squash body built from the commits would close #772 on its own.

## the body

feat(git.package.patch): pave the pnpm patch lifecycle as one rhx verb

- add rhx git.package.patch begin|commit: runs pnpm patch / patch-commit inside the tree only
- commit requires --why and an http(s) --upstream, writes a LOCAL PATCH note beside the patch
- commit names every file the seal changes: the patch, the note, the manifest entry, pnpm-lock.yaml
- refuses an --edit-dir outside the tree (.., absolute, symlink escape, the live install), -g, and
  npm / yarn / bun repos
- refuses a node-linker=hoisted repo (.npmrc or pnpm-workspace.yaml) and points to #772
- plan by default, --mode apply writes; a rerun with the same note is a no-op
- pre-approved in mechanic permissions; raw pnpm patch / patch-commit redirect to the verb

issues:
- refs #926 — this ships begin + commit. #926 stays open for get / check / del, the onStop pester,
  and the upgrade-safe install
- refs #772 — its own scenario is a hoisted (expo / react-native) repo, which this verb refuses.
  #772 stays open for the hoisted path and for --apply / --drop / --list
- #1014 can close: the paved verb makes a raw `pnpm patch` allow unneeded

the rhachet 1.50 bump and actor migration stay out of this pr (fulcrum F6)

# F47 — boot over budget after the rebase onto main

## .the fork
after the rebase onto main (v1.41.1), the mechanic src boot cost 30,125 of its 30,000-token cap (ci, boot.budget case3). options:
- raise the cap (the boot.yml note reserves that for a reviewed call)
- condense a say skill header
- demote one say skill to ref

## .taken, why
demote `skills/get.package.docs.sh` to ref. the say brief `rule.require.read-package-docs-before-use` already shows both of its calls (`readme --of`, `filetree --of`), so its say header duplicates what boots.

## .rework
clean: one line moved in `src/domain.roles/mechanic/boot.yml`; no caller changes.

## .confidence
85%. the commander may prefer a cap raise or a different demote; either reverses in one line.

## .where
`src/domain.roles/mechanic/boot.yml`

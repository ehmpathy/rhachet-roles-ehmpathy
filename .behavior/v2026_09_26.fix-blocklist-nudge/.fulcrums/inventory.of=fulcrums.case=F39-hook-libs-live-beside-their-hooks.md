# F39 — the hook libs live beside the hooks, in the role's inits

## .the fork

- **lift to `src/domain.operations/`:** per `rule.forbid.logic-in-role-dirs`, move
  `_permissions.render.lib.sh` and `_hardnudge.lib.sh` out of the role tree
- **keep beside the hooks:** the libs ship inside the role's inits, next to the hooks that source them

raised by peer review i009 (repo-rules, nitpick.2).

## .taken — keep, and why at the time

- a hook runs from the LINKED role dir (`.agent/repo=ehmpathy/role=mechanic/inits/claude.hooks/`)
  in every consumer repo, and finds its lib by `${BASH_SOURCE[0]%/*}`. a lib outside the role's
  `inits/` is not published with the role, so a consumer's hook could not reach it
- they are bash sourced at hook runtime, not TypeScript domain operations: the role's own
  `inits/claude.hooks/` already ships each hook's data beside it (`commands.alternatives.jsonc`,
  `terms.blocklist.jsonc`), and the libs are the same kind of hook-local artifact
- the rule targets operations the role's TypeScript assembly would import; these are payload the
  role publishes

## .rework

**dirty** — a new publication path for the role, and every hook's source line.

## .confidence — 85%

## .where

`src/domain.roles/mechanic/inits/claude.hooks/_*.lib.sh`

## .verdict

open

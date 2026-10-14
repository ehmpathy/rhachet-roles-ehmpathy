# F12 — the layer lib stays beside the hooks that source it

- **fork**: (a) keep `permissions.layers.operations.sh` in `mechanic/inits/claude.hooks/`, beside
  its three callers · (b) move it to `src/domain.operations/`, per `rule.forbid.logic-in-role-dirs`
- **taken**: (a). three reasons:
  - **the rule's own table places it here.** "the operation serves one skill → beside that skill".
    this lib serves one init family, the mechanic's three permission hooks, and no other caller.
    `rule.prefer.most-common-denominator` says nest at the most specific place
  - **(b) breaks the shipped hooks.** a hook runs from `.agent/repo=ehmpathy/role=mechanic/inits/`,
    a link into `dist/domain.roles/`. the build ships `.sh` files only where they sit under
    `inits/` or `skills/` (`build:complete:dist` rsync: `--include='**/inits/**/*.sh'`, then
    `--exclude='*'`). a `.sh` file under `src/domain.operations/` never reaches `dist/`, so each
    hook's `source "$(dirname "${BASH_SOURCE[0]}")/permissions.layers.operations.sh"` would fail
    in every consumer repo
  - **precedent.** a shell lib sourced by its sibling scripts lives beside them across this role:
    `git.commit.operations.sh`, `git.release.operations.sh`, `git.branch.rebase.operations.sh`,
    `set.package.operations.sh`. the rule's examples and remedy are typescript transformers
    reached by import, not shell sourced by relative path at runtime
- **and one lib, not five files** (r004 nitpick, `rule.require.single-responsibility`): the five
  functions are one layer rule — two dir lookups feed a third, which feeds the file list, which
  feeds the read. each `.operations.sh` precedent above holds several functions for the same
  reason; a hook sources one file, and five `source` lines per hook spread one rule across five
  files that only ever change together
- **rework**: dirty — a move needs a new build include rule, a new runtime path in three hooks,
  and a check that consumer repos still find the file
- **confidence**: 90%
- **where**: peer review r001 (repo-rules), i003 blocker.1
- **verdict**: —

# F11 · github.comment.operations.sh lives beside its three verbs, not in src/domain.operations/

- fork: the shared shell library of get | set | del sits in `skills/github.comment/` (beside the verbs it serves), or moves to `src/domain.operations/github.comment/` as `rule.forbid.logic-in-role-dirs` reads for a ts operation
- taken: beside the verbs. why, at the time:
  - **the runtime cannot reach it elsewhere.** the build copies only `**/skills/**/*.sh` (and inits) into `dist/` (`package.json` `build:complete:dist`, the rsync include list); `.agent/repo=ehmpathy/role=mechanic/skills/` links to `dist/domain.roles/mechanic/skills/`. a `.sh` under `src/domain.operations/` never ships, so `source "$SKILL_DIR/..."` would break in every consumer repo
  - **the rule's subject is a ts operation.** its examples are `as*.ts` transformers at a role root; `src/domain.operations/` holds zero `.sh` files today
  - **repo precedent: every shell skill family keeps its shared library in its skill dir** — `git.commit/git.commit.operations.sh` (set, push, uses), `git.commit/keyrack.operations.sh`, `git.release/git.release.operations.sh`, `git.branch.rebase/git.branch.rebase.operations.sh`, `git.repo.get/git.repo.get.operations.sh`, `set.package/set.package.operations.sh`
  - the rule's own placement table puts "one skill → beside that skill"; the three verbs are one skill family in one dir, which is that row
- rework: dirty — a move needs a build change (ship `.sh` from `domain.operations/` into dist and locate it from `.agent/`) that every shell skill family would then be expected to follow
- confidence: 85% — the runtime constraint is checked; whether the rule should grow a shell clause is the wisher's call
- where: `src/domain.roles/mechanic/skills/github.comment/github.comment.operations.sh`; r001 repo-rules i002 blocker.1
- verdict: open

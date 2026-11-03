# F15 — the shell ops stay in the skills tree, not `src/domain.operations/`

- fork: A. `skills/git.pull/*.operations.sh`, in the neutral dir the family shares · B. lift them
  to `src/domain.operations/git.pull/` (i002 r1 blocker.1, `rule.forbid.logic-in-role-dirs`)
- taken: A, because B breaks at runtime and fights the repo's own shape:
  - a skill sources its ops by a path relative to `$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)`.
    that is the LOGICAL path, through the `.agent/repo=ehmpathy/role=mechanic/skills` symlink, and
    `.agent` links only `dist/domain.roles/` (repo.structure.md). an op under
    `src/domain.operations/` is out of reach from a skill in any consumer repo
  - every shell ops file in this repo lives beside its skills (`git.commit.operations.sh`,
    `git.pull.comment.operations.sh`, `git.release.operations.sh`, `git.repo.get.operations.sh`,
    `set.package.operations.sh`, `git.branch.rebase.operations.sh`); `src/domain.operations/`
    holds zero `.sh` files
  - the rule's own placement table: an operation that serves skills lives beside them, at their
    common ancestor. `skills/git.pull/` is that ancestor for title and description, and it names
    no role
- rework: dirty. B needs a build step that ships shell ops into each role's dist tree, or a new
  source-path resolver for every skill; both reach well past this pull
- confidence: 85% (the rule's examples are all ts; whether it means shell ops at all is the call
  the reviewer may overrule)
- where: `src/domain.roles/mechanic/skills/git.pull/git.pull.operations.sh`,
  `src/domain.roles/mechanic/skills/git/git.attribution.operations.sh`
- verdict: open, for the pr review

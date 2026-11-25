# F1 — gate rule for several orgs

## .fork
a repo lists `org: [ahbode, bhanya]`. which meter verdict gates the commit?
- (a) every listed org must allow; the first refusal wins and is named
- (b) only the default org (member 0, what keyrack calls `@this`) gates
- (c) any one allowed org suffices

## .taken
(a). the org list is the set of orgs whose credentials this repo may reach (keyrack `asKeyrackManifestOrgs`, `assertKeyrackOrgMatchesManifest`). a human who blocks bhanya means "no work that touches bhanya". (b) and (c) let a repo that reaches bhanya commit past that block: a fail-open on a permission gate (rule.require.safe-by-default).

## .cost of (a)
a new list repo needs one `allow --org` per member, or `@all: allowed`. today 0 of the 72 local repos on origin/main use the list form (survey: `git.repo.get lines --repos '*/*' --words '^org:' --paths .agent/keyrack.yml`), so the extra allow touches no extant repo.

## .rework
clean: the rule lives in one loop in `check_org_blocker`. a switch to (b) is a one-line change plus test expectations.

## .confidence 80%, why low
what "a repo of org X" denotes is the human's call. a repo may list a peer org only to read one shared key; under (a) that read makes the peer's block bite.

## .where
`src/domain.roles/mechanic/skills/git.commit/git.commit.operations.sh` `check_org_blocker`

## .verdict
ruled by the director at vision approval: (a) stands

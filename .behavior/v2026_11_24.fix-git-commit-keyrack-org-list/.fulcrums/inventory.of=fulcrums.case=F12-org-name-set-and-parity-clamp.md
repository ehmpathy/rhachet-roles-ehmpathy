# F12 — the gate's org name set vs keyrack's, and a parity clamp against keyrack's cast

## .fork
keyrack's cast (rhachet `asKeyrackManifestOrgs`) takes any non-blank string as an org member. the gate's `as_keyrack_org_member` takes a plain name: `^@?[A-Za-z0-9][A-Za-z0-9_.-]*$`.
- name set: (a) keep the plain-name set, refuse others closed, and state the rule in the refusal · (b) widen to keyrack's set
- parity: (c) a clamp that feeds the `[case40]` fixtures to keyrack's real cast, in this pr · (d) that clamp rides the rhachet bump that ships the list cast to this repo

## .taken
(a) and (d).
- (a): an org name is a meter key and a word in the remedy the gate prints (`rhx git.commit.uses allow --org <org>`). a name with a space or a shell metachar would print a remedy that runs wrong when pasted. the plain set covers every github org name. a name outside it refuses closed (`org: shape not readable`), never grants, and the refusal now states the rule: `an org name is letters, digits, and _ . - (no spaces, no yaml anchor)`.
- (d): this branch's committed `package.json` pins `rhachet` 1.51.0; the list cast this gate mirrors ships in a later rhachet (1.54.1 sits only in uncommitted worktree churn, F6). a clamp against the pinned cast would grade the gate against a keyrack that may predate list support. the bump is its own change; the clamp belongs in it.

## .rework
clean. (b) is one regex; (c) is one test file that imports rhachet's cast.

## .confidence 75%
a reviewer could hold that the gate must accept every file keyrack accepts, odd names included; and that a clamp is owed now, with whatever rhachet is pinned.

## .dream
`dreams/v2026_11_24.refactor.keyrack-org-reader-and-refusal-render.md` item 7

## .verdict
best-guessed

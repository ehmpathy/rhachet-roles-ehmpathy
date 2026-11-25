closes #1480

## what this builds

`git.commit` reads `.agent/keyrack.yml` `org:` the way keyrack does: a scalar, a block list, or a flow list. every listed org must allow, and every surface that gates on the org agrees: `git.commit.set`, `git.commit.push`, the `git.branch.uses` cutover gate, and the cutover plan preview.

```yaml
org: ehmpathy            # one org
org: [ahbode, bhanya]    # a flow list, on one line
org:                     # a block list
  - ahbode
  - bhanya
```

a list with one org blocked refuses, names that org and its allow, and says why it gates:

```
└─ ✋ ConstraintError: commits blocked for org bhanya
   ├─ .agent/keyrack.yml org: lists ahbode, bhanya
   └─ every listed org must allow commits
```

an `org:` the gate cannot read is refused with the lines it read and the fix for that fault, never a grant. examples: an empty list, an absent key, a map, a flow list across lines, a quoted key, a duplicate key, an `@all` or repeated member, a yaml number, a name with a space. a file fault names its own fix: absent → create it, mode 000 → `chmod 644`, no repo → `cd` into one.

## why it works

- **one reader, two leaves.** `get_org_from_keyrack` reads the file (git root, absent and permission guards). `as_keyrack_org_members` parses the lines, pure, over a closed grammar. any shape outside the grammar refuses and never grants.
- **named faults, never a match on prose.** `ORG_KEYRACK_FAULT` (`repo-absent | repo-unreadable | file-absent | file-unreadable | org-unreadable`) and `ORG_UNREADABLE_KIND` (`key-absent | list-empty | shape | member-sigil | member-repeat`) pick the remedy on every surface. the meter remedy (`allow --org`) never prints for a file fault it cannot cure.
- **keyrack's member rules, mirrored.** an empty list, `@all`/`@this` as a member, a repeat, or a non-string member all refuse, as keyrack's `asKeyrackManifestOrgs` does. a scalar `org: '@all'` stays legal (grove scope).
- **the rule is declared.** `git.commit.set`, `git.commit.uses --org`, `git.commit.push`, and `git.branch.uses` help each state it.
- **package modes are clamped.** `src/domain.roles/package.modes.integration.test.ts` packs the real tarball and asserts each file ships 0644, or 0755 for `*.sh`. it went red with a 0555 file and green restored.

## proof

- integration: `git.commit` dir 676 passed · `git.branch.uses` 54 · `git.branch.cutover` 259 · package modes 2
- unit 170 · types · format · lint (biome)
- reader rows (`[case40]`) cover every shape and fault kind. gate rows (`[case41]`) cover each list case. `git.commit.set [case54]` snaps every refusal a human sees.

## known bounds

- **the consumer's 0555 persists until the rhachet fix lands.** this package publishes 0644/0755, and the clamp keeps it so. `rhachet roles link` then chmods linked role files to 0555 in the consumer, and pnpm's store keeps it, so `pnpm patch` still fails there (`ERR_PNPM_PATCH_FAILED`). the fix belongs in `ehmpathy/rhachet`. its task is queued but not yet delivered, because a global radio block holds it.
- **forms keyrack reads that this gate refuses closed:** a flow list across lines, a yaml anchor, a quoted key, and an org name outside letters, digits, and `_ . -`. each refusal shows the line read and states the rule.
- **deferred:** a refusal that names every refuser at once (today: the first, with the list tree), a json `branches` field on `git.commit.push --output json`, and a parity clamp against keyrack's cast (rides the rhachet bump). caught in `.behavior/v2026_11_24.fix-git-commit-keyrack-org-list/dreams/`.

## pushback footnote

- linked role files chmod-ed to 0o555 — `ehmpathy/rhachet` `symlinkResourceDirectories.js` (`setDirectoryReadonlyExecutable`) — overturned by `ERR_PNPM_PATCH_FAILED` in consumers, and by a read of this package's own install: `.md` files under linked role dirs are `r-xr-xr-x` while `boot.yml` and `*.js` stay `rw-rw-r--`. npm never marks a `.md` executable, so the chmod set it.

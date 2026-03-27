# review: has-no-silent-scope-creep (r3)

## methodology

compared `git diff origin/main --name-only` against blueprint filediff tree. identified files changed that are not part of the wish.

---

## files changed outside blueprint

| file | in blueprint? | analysis |
|------|---------------|----------|
| package.json | no | added "reflector" role, updated rhachet-roles-ehmpathy version |
| pnpm-lock.yaml | no | lockfile update from package.json |
| declapract.upgrade/exec.sh | no | removed `git add .` line |
| declapract.upgrade/templates/2.detect.hazards.stone | no | updated diff command |

---

## scope creep analysis

### package.json changes

**change 1: added "reflector" role**
```diff
- "prepare:rhachet": "npm run build && rhachet init --hooks --roles mechanic behaver driver reviewer librarian ergonomist architect",
+ "prepare:rhachet": "npm run build && rhachet init --hooks --roles mechanic behaver driver reviewer librarian ergonomist architect reflector",
```

| aspect | analysis |
|--------|----------|
| related to wish? | no |
| resolution | **[repair]** - revert this change |
| rationale | this is unrelated infrastructure that snuck in |

**change 2: rhachet-roles-ehmpathy version**
```diff
- "rhachet-roles-ehmpathy": "link:.",
+ "rhachet-roles-ehmpathy": "1.34.5",
```

| aspect | analysis |
|--------|----------|
| related to wish? | no |
| resolution | **[repair]** - revert this change |
| rationale | switch from link:. to a pinned version breaks local dev |

### declapract.upgrade changes

**change 1: removed git add from exec.sh**
```diff
- echo ""
- echo "🗃️ stage changes"
- git add .
```

| aspect | analysis |
|--------|----------|
| related to wish? | no |
| resolution | **[repair]** - revert this change |
| rationale | unrelated refactor of a different skill |

**change 2: hazards.stone diff command**
```diff
- git diff origin/main...HEAD
+ git diff
```

| aspect | analysis |
|--------|----------|
| related to wish? | no |
| resolution | **[repair]** - revert this change |
| rationale | unrelated template change |

---

## summary

| scope creep | count | resolution |
|-------------|-------|------------|
| package.json changes | 2 | repair |
| declapract.upgrade changes | 2 | repair |
| **total** | **4** | **all repair** |

---

## repair action required

before this stone can pass, revert the scope creep:

```sh
git checkout origin/main -- package.json pnpm-lock.yaml
git checkout origin/main -- src/domain.roles/mechanic/skills/declapract.upgrade/
```

---

## git.release files (verified in scope)

all files under `src/domain.roles/mechanic/skills/git.release/` are in scope per blueprint:
- 6 new decomposed operation files (_.*.sh)
- updated git.release.sh
- updated git.release.operations.sh
- updated output.sh
- updated p1/p2 tests and snapshots
- new p3 tests and snapshots (untracked)
- updated spec files

these are not scope creep.

---

## conclusion

| check | status |
|-------|--------|
| git.release changes in scope | ✓ |
| package.json changes | ✗ scope creep detected |
| declapract.upgrade changes | ✗ scope creep detected |
| repair action defined | ✓ |

**scope creep detected. repair required before stone can pass.**

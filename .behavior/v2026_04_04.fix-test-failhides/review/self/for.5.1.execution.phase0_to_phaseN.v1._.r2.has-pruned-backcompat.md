# self-review r1: has-pruned-backcompat

## the question

> did we add backwards compatibility that was not explicitly requested?

---

## step 1: enumerate potential backcompat concerns

| concern | description |
|---------|-------------|
| old file paths | boot.yml references to `rule.require.fail-fast.md` |
| old rule names | references to "fail-fast" in other briefs or code |
| extant rule content | the content of rule.require.fail-fast.md |

---

## step 2: check each concern

### old file paths in boot.yml

**question:** did we keep both old and new paths in boot.yml "to be safe"?

**answer:** no. we updated all references from `fail-fast` to `failfast`. no dual references.

**evidence:**
```yaml
# before
- briefs/practices/code.prod/pitofsuccess.errors/rule.require.fail-fast.md

# after
- briefs/practices/code.prod/pitofsuccess.errors/rule.require.failfast.md
```

**verdict:** no unnecessary backcompat added.

**why it holds:**
- vision explicitly prescribed rename
- both paths would be backcompat we did not need
- clean rename, no transition shims

### old rule names in references

**question:** did we add re-exports or aliases from old name to new name?

**answer:** no. we did a clean rename without shims.

**evidence:** no `rule.require.fail-fast.md` file extant after execution. git status shows rename, not copy.

**verdict:** no unnecessary backcompat added.

**why it holds:**
- aliases would be YAGNI
- clean rename is what was prescribed
- no evidence of external consumers that need transition period

### extant rule content

**question:** did we modify rule content to add backcompat shims?

**answer:** no. blueprint said [○] retain for extant rules. we only renamed the file.

**verdict:** no unnecessary backcompat added.

**why it holds:**
- content unchanged
- no deprecation warnings added
- no "previously known as" comments

---

## step 3: check for "to be safe" additions

| potential backcompat | added? | verdict |
|---------------------|--------|---------|
| keep old file as alias | no | correct — clean rename |
| add deprecation comment in rule | no | correct — not requested |
| dual boot.yml entries | no | correct — single reference |
| transition period for old name | no | correct — immediate rename |

---

## issues found

none. no unnecessary backwards compatibility was added.

---

## why backcompat is clean

| check | result |
|-------|--------|
| old file paths removed? | yes — no dual references |
| no re-export shims? | yes — clean rename |
| no deprecation comments? | yes — content unchanged |
| no transition period? | yes — immediate rename |

**key insight:** the rename was clean because vision explicitly prescribed it. we did not add "safety" backcompat that was not requested.

---

## what could have been backcompat (avoided)

### could have: kept both file names

**why it would be wrong:** creates confusion and maintenance burden. which one is canonical?

**what we did instead:** renamed file, removed old name completely.

### could have: added "previously fail-fast" comment

**why it would be wrong:** clutters the rule with historical notes that have no operational value.

**what we did instead:** clean rename, no historical comments.

### could have: gradual migration via re-exports

**why it would be wrong:** no external consumers documented. internal rules can rename instantly.

**what we did instead:** instant rename, update all references in same commit.

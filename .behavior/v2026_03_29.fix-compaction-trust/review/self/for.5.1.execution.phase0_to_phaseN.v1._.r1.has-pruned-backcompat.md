# self-review r1: has-pruned-backcompat

## backwards compatibility review

### component 1: brief `rule.require.trust-but-verify.md`

**backwards compat concerns?** none
- new file, no prior version
- no extant behavior to preserve

**verdict:** [OK] n/a — new artifact

---

### component 2: hook `postcompact.trust-but-verify.sh`

**backwards compat concerns?** none
- new file, no prior version
- PostCompact is a new hook event (no extant hooks to conflict with)

**verdict:** [OK] n/a — new artifact

---

### component 3: boot.yml registration

**backwards compat concerns?** none
- additive change only
- prepended to say section, does not remove extant entries
- extant brief order preserved

**why it holds:**
- line added: `- briefs/practices/work.flow/rule.require.trust-but-verify.md`
- no lines removed
- no lines reordered beyond the insertion

**verdict:** [OK] additive only

---

### component 4: getMechanicRole.ts registration

**backwards compat concerns?** none
- additive change only
- appended to hooks.onBrain.onBoot array
- extant hooks preserved in order

**why it holds:**
- new entry added at end of onBoot array
- no extant entries modified or removed
- no filter conflicts (PostCompact is unique)

**verdict:** [OK] additive only

---

### component 5: integration tests

**backwards compat concerns?** none
- new file, no prior version
- does not modify extant test files

**verdict:** [OK] n/a — new artifact

---

## summary

| component | compat concern? | explicit request? | verdict |
|-----------|-----------------|-------------------|---------|
| brief | none (new) | n/a | [OK] |
| hook | none (new) | n/a | [OK] |
| boot.yml | additive only | n/a | [OK] |
| getMechanicRole.ts | additive only | n/a | [OK] |
| tests | none (new) | n/a | [OK] |

**backwards compat violations found:** 0
**assumed-to-be-safe additions:** 0

## what i'll remember

- all changes are additive — no removals, no modifications to extant behavior
- no backwards compat shims needed for new artifacts

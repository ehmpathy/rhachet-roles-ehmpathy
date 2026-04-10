# self-review: has-pruned-backcompat

review for backwards compatibility that was not explicitly requested.

---

## backwards compatibility concerns reviewed

### concern: extant `--what lint` behavior

**what is preserved?**: the extant lint behavior in git.repo.test.sh.

**did wisher explicitly request this compatibility?**: yes. wish says "stream the full test results into a .log/.../ dir, just like --what lint does today". this explicitly references extant behavior and implies it should be preserved.

**evidence it is needed?**: yes. lint is used in hooks (onStop). clones depend on this behavior. criteria usecase.4 says "run lint (extant behavior)".

**verdict**: keep. explicitly referenced in wish and criteria.

---

### concern: log directory structure

**what is preserved?**: `.log/role=mechanic/skill=git.repo.test/` path.

**did wisher explicitly request this compatibility?**: implied. wish says "stream the full test results into a .log/.../ dir". the specific path follows extant convention.

**evidence it is needed?**: yes. extant lint behavior uses this path. a different path would cause confusion and inconsistency.

**verdict**: keep. follows extant convention, no reason to change.

---

### concern: exit code semantics

**what is preserved?**: 0=passed, 1=malfunction, 2=constraint.

**did wisher explicitly request this compatibility?**: implied. wish doesn't mention exit codes, but this is ehmpathy convention across all skills.

**evidence it is needed?**: yes. callers (hooks, clones) depend on these semantics. criteria usecase.1-4 mention exit codes.

**verdict**: keep. standard convention, no reason to change.

---

### concern: turtle vibes output format

**what is preserved?**: 🐢 header, 🐚 tree root, ├─ └─ tree structure.

**did wisher explicitly request this compatibility?**: yes. wish says "conform to extant skill vibes w/ headers and treestructs and treebuckets".

**evidence it is needed?**: yes. mechanic role has consistent output format. a format break would cause confusion.

**verdict**: keep. explicitly requested in wish.

---

### concern: npm command convention (`test:unit`, `test:integration`, etc.)

**what is preserved?**: assumption that repos have `npm run test:unit`, etc.

**did wisher explicitly request this compatibility?**: implied. wish says "auto run the npm run test:xyz correctly". this references the extant convention.

**evidence it is needed?**: yes. declapract templates enforce this convention. all ehmpathy repos follow it.

**verdict**: keep. follows extant convention, fail-fast guides adoption.

---

### concern: RESNAP environment variable

**what is preserved?**: `RESNAP=true` triggers snapshot update.

**did wisher explicitly request this compatibility?**: yes. wish says "make it easy to --resnap snapshots". this references the extant convention.

**evidence it is needed?**: yes. jest configs in ehmpathy repos check `RESNAP=true`.

**verdict**: keep. explicitly referenced in wish.

---

### concern: keyrack owner `ehmpath`

**what is preserved?**: keyrack unlock uses `--owner ehmpath --env test`.

**did wisher explicitly request this compatibility?**: implied. wish says "auto unlock keyracks" without explicit owner.

**evidence it is needed?**: yes. keyrack research confirms ehmpathy repos use ehmpath owner.

**verdict**: keep. follows extant convention per research.

---

## backwards compatibility NOT found

searched for backwards compat concerns that were added "to be safe":

1. **vitest support**: not added. deferred explicitly.
2. **jest 30 compatibility**: not added. deferred explicitly.
3. **fallback test runner detection**: not added. assumes jest.
4. **legacy npm command names**: not added. assumes convention.

no backwards compat was added speculatively.

---

## summary

| concern | wisher requested? | evidence needed? | verdict |
|---------|-------------------|------------------|---------|
| --what lint behavior | yes (explicitly) | yes | keep |
| log directory structure | implied | yes | keep |
| exit code semantics | implied | yes | keep |
| turtle vibes format | yes (explicitly) | yes | keep |
| npm command convention | implied | yes | keep |
| RESNAP env var | yes (explicitly) | yes | keep |
| keyrack owner ehmpath | implied | yes | keep |

---

## conclusion

**no backwards compat issues found.**

all backwards compatibility concerns in the blueprint are either:
1. explicitly requested by wisher
2. implied by wisher with evidence of need
3. standard convention with clear need

no backwards compat was added speculatively "to be safe". items that could have been added for backwards compat (vitest support, jest 30 compat, legacy command names) were correctly deferred rather than added.

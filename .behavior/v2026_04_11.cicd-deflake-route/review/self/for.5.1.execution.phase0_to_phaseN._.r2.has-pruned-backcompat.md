# self-review: has-pruned-backcompat

## question

for each backwards-compat concern in the code, ask:
- did the wisher explicitly say to maintain this compatibility?
- is there evidence this backwards compat is needed?
- or did we assume it "to be safe"?

## review

### context

this is a **brand new skill** (`cicd.deflake`). there is no prior version.

therefore, there are **zero backwards compatibility concerns** to evaluate.

### deeper inspection

even for new code, i looked for hidden backwards-compat assumptions:

#### 1. does the skill mimic another skill's API "for familiarity"?

the skill follows `declapract.upgrade` patterns:
- same subcommand dispatch pattern
- same output.sh structure
- same template-based route creation

**assessment:** these are **intentional patterns**, not backwards compat. we follow them for consistency across mechanic skills, not to maintain any prior API.

#### 2. does any output format need to stay stable?

`detect.sh` outputs JSON to `--into` path:
```json
{ "flakes": [...], "metadata": {...} }
```

**assessment:** this is a **new format** with no consumers yet. no backwards compat to maintain. the format can evolve freely until it has dependents.

#### 3. does the route structure have hidden dependencies?

the route uses standard stone/guard names:
- `1.evidence.stone`, `2.1.diagnose.research.stone`, etc.

**assessment:** this follows the route pattern from rhachet, not backwards compat. the stone names were chosen fresh based on the deflake workflow.

#### 4. does `SKIP_ROUTE_BIND` env var need compat?

used in tests to skip route bind in temp directories.

**assessment:** this follows the same pattern as `declapract.upgrade` tests. it's a test utility pattern, not a public API.

### code review summary

| file | backwards-compat items | verdict |
|------|------------------------|---------|
| cicd.deflake.sh | none | new entry point |
| output.sh | none | follows ehmpathy role pattern |
| init.sh | none | follows declapract.upgrade pattern |
| detect.sh | none | new JSON format, no consumers |
| templates/*.stone | none | new workflow, new names |
| templates/*.guard | none | new guards |
| tests | none | SKIP_ROUTE_BIND is test utility |

### conclusion

**no backwards compatibility code was added** because:
1. this is a new skill with no prior users
2. there is no prior API to maintain
3. patterns followed are for consistency, not compat
4. no deprecation paths needed

**verdict:** greenfield implementation. no backwards compat concerns found.

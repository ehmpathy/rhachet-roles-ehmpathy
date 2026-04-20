# self-review r6: has-pruned-backcompat

## verification

reviewed blueprint for backwards compatibility concerns that were not explicitly requested. for each potential concern, asked: was this requested, or assumed "to be safe"?

---

## what is backwards compatibility?

backwards compat means: don't break what worked before.

it arises when:
- a prior version exists with an established interface
- users have expectations based on that prior version
- data or state from prior runs must remain valid
- behavior changes could break dependent systems

the key question: **did we add complexity to avoid breakage that we assumed rather than confirmed?**

---

## enumeration of potential backwards compat concerns

### 1. pattern match with declapract.upgrade

**the blueprint says:** "follows the same pattern as declapract.upgrade"

**is this backwards compat?**

this could be misread as backwards compat: "we kept the declapract.upgrade interface to avoid confusion for users who know that skill."

**why it's not backwards compat:**

the wish explicitly says: "just like we have a declapract.upgrade thought route skill, we want to create another one for cicd.deflake."

the wisher asked for pattern similarity. this is not an assumption we made "to be safe" — it's a direct requirement.

**what would backwards compat look like here?**

if we had said: "declapract.upgrade uses `exec` subcommand, but we'll call it `run` instead, while also we support `exec` as an alias for users who expect it" — that would be backwards compat. we'd preserve an interface that isn't required.

we did not do this. there's no cicd.deflake.exec subcommand for backwards compat. we only have init and help.

**verdict:** not a backwards compat concern. explicit wish requirement.

---

### 2. route driver interface compatibility

**the blueprint implies:** templates are .stone and .guard files, route path is .behavior/v{date}.cicd-deflake/

**is this backwards compat?**

this could be misread as: "we follow the route driver's interface for backwards compat with extant routes."

**why it's not backwards compat:**

this is forward compatibility, not backwards compat. we need the route driver to understand our templates. if our templates don't match the driver's expectations, the skill won't work.

backwards compat would be: "we support both the old route format AND the new format." we didn't do that — there's no old format.

**verdict:** forward compatibility with driver, not backwards compat.

---

### 3. exit code semantics (0/1/2)

**the blueprint says:** exit 0 = success, exit 1 = malfunction, exit 2 = constraint

**is this backwards compat?**

this could be misread as: "we preserve exit code semantics for compatibility with parsers."

**why it's not backwards compat:**

these exit codes are mechanic skill standards (rule.require.exit-code-semantics). every mechanic skill uses them. this is pattern adherence, not preservation of a prior interface.

backwards compat would be: "cicd.deflake v1 used exit code 3 for constraints, but we'll support both 2 and 3." we didn't do that — there's no v1 interface.

**verdict:** standard pattern adherence, not backwards compat.

---

### 4. turtle vibes output format

**the blueprint says:** use print_turtle_header, print_tree_branch, etc.

**is this backwards compat?**

this could be misread as: "we preserve the turtle vibes format so users recognize mechanic skill output."

**why it's not backwards compat:**

the vision explicitly shows turtle vibes output. the format is a design requirement, not a compat shim.

backwards compat would be: "we support both turtle vibes AND plain text output for users who expect the old format." we didn't do that — there's no old format.

**verdict:** vision requirement, not backwards compat.

---

### 5. SKIP_ROUTE_BIND environment flag

**the blueprint says:** tests use SKIP_ROUTE_BIND=1 for isolated test environments

**is this backwards compat?**

this could be misread as: "we support this flag for backwards compat with extant test patterns."

**why it's not backwards compat:**

this is test isolation, not interface preservation. the flag lets tests run without a real rhachet installation. it's not about backwards compat with a prior cicd.deflake version — it's about test infrastructure.

backwards compat would be: "cicd.deflake v1 used SKIP_BIND, but v2 uses SKIP_ROUTE_BIND, and we support both." we didn't do that.

**verdict:** test isolation pattern, not backwards compat.

---

### 6. template content structure

**the blueprint shows:** each stone has .why, section headers, emit line

**is this backwards compat?**

this could be misread as: "we follow the standard template structure for compat with extant routes."

**why it's not backwards compat:**

this is route driver convention, not preservation of a prior interface. the driver expects certain structure. if we deviated, the driver couldn't parse our templates.

backwards compat would be: "we support both the old template format (without .why) AND the new format." we didn't do that.

**verdict:** driver convention, not backwards compat.

---

## the core insight

**backwards compat requires a prior version to be compatible WITH.**

cicd.deflake is new. there is no:
- prior cicd.deflake version
- prior cicd.deflake users
- prior cicd.deflake data
- prior cicd.deflake interface

every "compat" concern in the blueprint is either:
1. **forward compat** with the route driver (required for function)
2. **pattern adherence** to mechanic standards (required by role briefs)
3. **explicit requirement** from the wish/vision

none are assumptions made "to be safe" about a prior version.

---

## what backwards compat would look like

if this skill had backwards compat, we'd see:
- alias commands that preserve old names
- deprecated flags that still work
- migration paths for old data formats
- code comments like "// kept for backwards compat"
- shims that translate old interfaces to new

the blueprint has none of these.

---

## verdict

**no backwards compat concerns detected.**

the review examined 6 potential areas: pattern adherence, driver interface, exit codes, output format, env flags, template structure.

each is either forward compatibility (required for function), pattern adherence (required by briefs), or explicit wish requirement.

the blueprint adds no complexity to preserve a prior interface that doesn't exist.

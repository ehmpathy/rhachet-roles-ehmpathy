# self-review: has-pruned-backcompat

reviewed for backwards compatibility that was not requested.

## backwards compat concern 1: multiple command patterns

the hook checks 3 patterns:
1. `rhx git.repo.test`
2. `npx rhachet run --skill git.repo.test`
3. `./node_modules/.bin/rhx git.repo.test`

**was this explicitly requested?** no, the wish only mentioned "rhx git.repo.test"

**is there evidence this is needed?** yes:
- `rhx` is an alias for `npx rhachet run --skill`
- `./node_modules/.bin/rhx` is the direct path
- clones may use any of these forms

**or did we assume "to be safe"?** partially. we added patterns to be thorough.

**verdict:** OPEN QUESTION - should we only block `rhx git.repo.test` or all equivalent forms?

**recommendation:** keep all patterns. block one form while allow others defeats the purpose.

---

## backwards compat concern 2: empty input handle

the hook allows empty input (exits 0 instead of error).

**was this explicitly requested?** no.

**is there evidence this is needed?** yes - other hooks follow this pattern. empty stdin should not cause hook failure.

**verdict:** holds. standard hook pattern.

---

## backwards compat concern 3: hook position (first in list)

the hook is registered first in the onTool array.

**was this explicitly requested?** no.

**is there evidence this matters?** maybe - hooks run in order. first position means it blocks before other hooks run.

**verdict:** holds. early block prevents wasted work in subsequent hooks.

---

## summary

| concern | requested | evidence | verdict |
|---------|-----------|----------|---------|
| multiple patterns | no | yes | keep (thorough block) |
| empty input | no | yes | keep (standard) |
| hook position | no | maybe | keep (early block) |

## open question for wisher

should the hook block all equivalent command forms (`rhx`, `npx rhachet run`, `./node_modules/.bin/rhx`) or only the specific `rhx git.repo.test` form?

**recommendation:** keep all forms blocked. otherwise clones could bypass via different invocation style.

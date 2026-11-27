## .rule = forbid-term-helpers

### .what
term `helpers` forbidden — vague and meaningless

### .scope
- code: file names, function names, variable names, comments
- files: filenames, directory names
- docs: markdown, briefs, prompts
- comms: commit messages, pr descriptions

### .why
- `helpers` adds zero information — all code "helps"
- hides actual purpose and domain
- lazy placeholder for unclear intent
- prevents discovery via naming

### .enforcement
use of `helpers` = **blocker**

### .alternatives

| 👎 vague | 👍 precise | .when |
|----------|-----------|-------|
| `helpers.sh` | `operations.sh` | domain operations |
| `helpers.ts` | `utils.ts` | pure utilities |
| `helpers/` | `operations/` | domain logic dir |
| `testHelpers` | `fixtures` | test setup |
| `testHelpers` | `mocks` | test doubles |

### .see also
- `philosophy.why-we-ban-terms` — why a heavy word gets banned
- `rule.forbid.term=helpers.example=demo` — a 👎/👍 demo
- `rule.forbid.term=normalize` — similar vague term
- `rule.forbid.term=script` — another overloaded term
- `rule.require.ubiqlang` — use precise domain terms

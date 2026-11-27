### .rule = forbid-term-resolve

#### .what
the term `resolve` is forbidden — it is overloaded and vague

#### .scope
- code: variable names, function names, comments
- files: filenames, directory names
- docs: markdown, briefs, prompts
- comms: commit messages, pr descriptions

#### .why
- `resolve` suffers from severe semantic diffusion
- when everything can be "resolved", nothing is clearly communicated
- forces the reader to guess which meaning was intended
- hides the actual operation being performed

#### .purposes conflated by "resolve"

the term is used for at least 7 distinct purposes:

| purpose       | what it means                          | precise alternative            |
| ------------- | -------------------------------------- | ------------------------------ |
| **derive**    | compute from other values              | `derive`, `compute`            |
| **infer**     | deduce from context or convention      | `infer`, `deduce`              |
| **extract**   | pull out of a larger structure         | `extract`, `pick`, `pluck`     |
| **expand**    | fill in defaults or follow references  | `expand`, `hydrate`, `inflate` |
| **lookup**    | find by key in a known source          | `lookup`, `find`, `fetch`      |
| **decide**    | pick based on conditions               | `decide`, `select`, `choose`   |
| **settle**    | bring to a final status (e.g., promise) | `settle`, `await`, `complete`  |

when someone says "resolve", they could mean any of these — or several at once.

#### .enforcement
use of `resolve` = **BLOCKER**

#### .common usecases

| vague                  | precise              | .what it actually does                     |
| ---------------------- | -------------------- | ------------------------------------------ |
| `resolvePath`          | `expandPath`         | expand relative to absolute path           |
| `resolveConfig`        | `deriveConfig`       | compute final config from defaults + input |
| `resolveType`          | `inferType`          | deduce type from context                   |
| `resolveDependencies`  | `expandDependencies` | expand transitive dependency tree           |
| `resolveUser`          | `lookupUser`         | find user by id in database                |
| `resolveTemplate`      | `expandTemplate`     | fill in template variables                 |
| `resolveConflict`      | `settleConflict`     | bring conflict to final status              |
| `resolvePromise`       | `settlePromise`      | bring promise to fulfilled status           |
| `resolveValue`         | `extractValue`       | pull value from nested structure           |
| `resolveStrategy`      | `decideStrategy`     | select strategy based on conditions        |

#### .see also
- `philosophy.why-we-ban-terms` — why a heavy word gets banned
- `rule.forbid.term=resolve.example=demo` — a 👎/👍 demo
- `rule.forbid.term=normalize` — similar overloaded term
- `rule.require.ubiqlang` — use precise domain terms

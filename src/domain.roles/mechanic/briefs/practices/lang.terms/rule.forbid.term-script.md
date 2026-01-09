### .rule = forbid-term-script

#### .what
the term `script` is forbidden — it is overloaded and vague

#### .scope
- code: variable names, function names, comments
- files: filenames, directory names
- docs: markdown, briefs, prompts
- comms: commit messages, pr descriptions

#### .why
- `script` means too many things — it carries no precise signal
- "all code is scripted" — the term adds no information
- forces lazy categorization instead of domain clarity
- hides the actual purpose and lifecycle of the code

#### .enforcement
use of `script` = **BLOCKER**

#### .alternatives

| 👎 vague  | 👍 precise   | .when                            |
| -------- | ----------- | -------------------------------- |
| `script` | `command`   | shell-invoked, adhoc usage       |
| `script` | `procedure` | reusable sequence of steps       |
| `script` | `operation` | domain logic with business rules |
| `script` | `task`      | background or scheduled work     |
| `script` | `migration` | database schema or data changes  |
| `script` | `hook`      | lifecycle callback               |
| `script` | `skill`     | agent-invoked capability         |
| `script` | `init`      | setup or bootstrap logic         |
| `script` | `transform` | data shape conversion            |
| `script` | `handler`   | event or request responder       |

#### .examples

**👎 bad**
```
scripts/
  deploy-script.sh
  cleanup-script.js
  data-script.ts
```

```ts
// run the script to fix the data
const runScript = () => { ... };
```

**👍 good**
```
commands/
  deploy.sh
  cleanup.command.ts
migrations/
  2024-01-fix-user-data.ts
```

```ts
// run the migration to fix the data
const runMigration = () => { ... };

// invoke the command to deploy
const invokeDeployCommand = () => { ... };
```

#### .note: filenames
common renames:

| 👎 vague           | 👍 precise             |
| ----------------- | --------------------- |
| `scripts/`        | `commands/` or `bin/` |
| `run-script.sh`   | `run.command.sh`      |
| `build-script.js` | `build.command.js`    |
| `test-script.ts`  | `test.command.ts`     |
| `setup-script.sh` | `init.sh`             |

#### .see also
- `rule.require.ubiqlang` — use precise domain terms
- `rule.require.treestruct` — name structure guidance

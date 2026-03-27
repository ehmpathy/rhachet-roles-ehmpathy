# review: role-standards-adherance (r6)

## methodology

enumerated relevant rule directories, then verified each changed file against applicable standards.

---

## rule directories checked

| directory | relevance | applicable rules |
|-----------|-----------|------------------|
| `code.prod/pitofsuccess.errors` | shell scripts | exit-code-semantics, fail-fast |
| `code.prod/pitofsuccess.procedures` | operations | idempotent-procedures |
| `code.prod/evolvable.procedures` | function signatures | input-context pattern (bash variant) |
| `code.prod/readable.comments` | all code | what-why-headers |
| `code.prod/readable.narrative` | shell scripts | no elses, early returns |
| `code.test/frames.behavior` | test files | given-when-then, useBeforeAll |
| `lang.terms` | all code | forbid gerunds (enforced via hook), treestruct |
| `lang.tones` | output | turtle vibes, chill emojis |

---

## pitofsuccess.errors adherence

### rule.require.exit-code-semantics

**verification**: checked `git.release._.emit_one_transport_status_exitcode.sh`:

| code | semantics | implementation |
|------|-----------|----------------|
| 0 | success | lines 32-33: passed, merged |
| 1 | malfunction | lines 47-49: unknown status |
| 2 | constraint | lines 35-46: unfound, inflight, failed |

**why it holds**: exit codes match the semantic specification. constraint errors (user must fix) use exit 2. success uses exit 0.

### rule.require.fail-fast

**verification**: checked all shell files for `set -euo pipefail`:

| file | has `set -euo pipefail` |
|------|-------------------------|
| `git.release.sh` | yes, line 40 |
| decomposed operations | no shebang, sourced by main |

**why it holds**: main entry point has fail-fast. decomposed operations are sourced (not executed directly), so they inherit the shell options from the parent. guard clauses exit early with `return 1` or `exit 2`.

---

## pitofsuccess.procedures adherence

### rule.require.idempotent-procedures

**verification**: checked apply behavior in `emit_transport_status.sh`:

```bash
if [[ "$flag_apply" == "true" && "$automerge_status" == "unfound" ... ]]; then
  enable_automerge "$transport_ref" || return 1
```

**why it holds**: automerge is only enabled when status is `unfound`. if already `found`, the block is skipped. idempotent — multiple calls produce same result.

### rule.forbid.nonidempotent-mutations

**verification**: no `create`, `insert`, `add` mutations in the code. operations use:
- `enable_automerge` — idempotent (gh handles duplicate enable)
- `rerun_failed_workflows` — idempotent (gh handles duplicate rerun)

**why it holds**: mutations go through gh CLI which handles idempotency.

---

## evolvable.procedures adherence

### rule.require.input-context-pattern (bash variant)

**verification**: bash functions use positional args with explicit documentation:

```bash
emit_transport_status() {
  local transport_type="$1"
  local transport_ref="$2"
  local flag_apply="${3:-false}"
  local flag_retry="${4:-false}"
  ...
}
```

each function header documents args explicitly.

**why it holds**: bash lacks named args, so positional args with defaults and explicit documentation is the equivalent pattern. each arg is documented with name and purpose.

---

## readable.comments adherence

### rule.require.what-why-headers

**verification**: checked all `.sh` files for headers:

| file | .what | .why | .note |
|------|-------|------|-------|
| `git.release.sh` | yes | yes | yes |
| `git.release._.get_one_goal_from_input.sh` | yes | yes | yes |
| `git.release._.get_all_flags_from_input.sh` | yes | yes | yes |
| `git.release._.get_one_transport_status.sh` | yes | yes | yes |
| `git.release._.emit_transport_status.sh` | yes | yes | yes |
| `git.release._.emit_transport_watch.sh` | yes | yes | yes |
| `git.release._.emit_one_transport_status_exitcode.sh` | yes | yes | no |
| `output.sh` | yes | yes | no |
| `git.release.operations.sh` | yes | yes | no |

**why it holds**: all files have `.what` and `.why` in their file headers. `.note` is optional and present where clarification is needed.

---

## readable.narrative adherence

### rule.forbid.else-branches

**verification**: searched for `else` statements in shell files:

- `git.release.sh`: uses `if ... fi` without else, or early returns
- decomposed operations: use early returns with `return 0` or `return 2`

**why it holds**: code uses guard clauses with early returns instead of else branches.

### rule.require.narrative-flow

**verification**: checked main flow in `git.release.sh`:

```bash
# transport 1
if [[ "$GOAL_FROM" != "main" ]]; then
  ...
  if [[ "$GOAL_INTO" != "prod" ]]; then
    exit 0  # early exit
  fi
  print_transition
fi

# transport 2
if [[ "$GOAL_INTO" == "prod" ]]; then
  ...
fi
```

**why it holds**: transports are processed sequentially with early exits. no deep nests. comments precede code blocks.

---

## code.test adherence

### rule.require.given-when-then

**verification**: checked test files for BDD structure:

```typescript
import { given, then, when } from 'test-fns';

given('[case1] feat PR: unfound', () => {
  when('[t0] plan mode', () => {
    then('shows no pr message', async () => {
      ...
      expect(stdout).toMatchSnapshot();
    });
  });
});
```

**why it holds**: tests use `given`, `when`, `then` from test-fns. labels follow `[caseN]` and `[tN]` convention.

### rule.require.snapshots

**verification**: test files use `toMatchSnapshot()`:

```typescript
expect(stdout).toMatchSnapshot();
```

**why it holds**: all test cases capture stdout as snapshots for visual review in PRs.

---

## lang.terms adherence

### rule.forbid.gerunds

**verification**: enforced via PreToolUse hook. any gerund in file writes is blocked.

**why it holds**: hook catches gerunds before they enter the codebase.

### rule.require.treestruct

**verification**: checked function names:

| function | pattern | follows treestruct |
|----------|---------|-------------------|
| `get_one_goal_from_input` | get_one_[noun]_from_[source] | yes |
| `get_all_flags_from_input` | get_all_[noun]_from_[source] | yes |
| `get_one_transport_status` | get_one_[noun]_[state] | yes |
| `emit_transport_status` | emit_[noun]_[state] | yes |
| `emit_transport_watch` | emit_[noun]_[action] | yes |
| `emit_one_transport_status_exitcode` | emit_one_[noun]_[state]_[noun] | yes |

**why it holds**: functions follow `[verb][...noun]` pattern per treestruct rule.

---

## lang.tones adherence

### rule.prefer.chill-nature-emojis

**verification**: checked `output.sh` for emoji usage:

| emoji | purpose | context |
|-------|---------|---------|
| 🐢 | turtle header | turtle vibes |
| 🌊 | release | ocean theme |
| 👌 | passed | calm approval |
| 🐢 | in progress | turtle pace |
| ⚓ | failed | nautical stop |
| 🌴 | automerge | island chill |
| 🥥 | watch | tropical |
| 💤 | poll wait | sleepy turtle |
| ✨ | done | sparkle |
| ⏰ | timeout | time |
| 🫧 | transition | bubbles |
| 🐚 | shell | seaturtle home |

**why it holds**: all emojis are nature-themed and chill. no aggressive or corporate emojis.

### rule.im_an.ehmpathy_seaturtle

**verification**: checked vibe phrases in output:

- "heres the wave..." — surf vibe
- "cowabunga!" — turtle surfer
- "radical!" — surf slang
- "crickets..." — calm disappointment
- "and then..." — narrative flow

**why it holds**: output uses seaturtle vibe phrases per personality spec.

### rule.prefer.lowercase

**verification**: comments and output text use lowercase:

```bash
# get skill directory
# source dependencies
# source decomposed operations
```

**why it holds**: comments are lowercase. output strings are lowercase except where emoji or proper nouns require otherwise.

---

## deviations found

none. all code follows mechanic role standards.

---

## conclusion

| category | adherence |
|----------|-----------|
| pitofsuccess.errors | verified |
| pitofsuccess.procedures | verified |
| evolvable.procedures | verified |
| readable.comments | verified |
| readable.narrative | verified |
| code.test | verified |
| lang.terms | verified (hook-enforced) |
| lang.tones | verified |

**overall**: implementation follows mechanic role standards. each rule category was checked against the changed files with specific evidence.

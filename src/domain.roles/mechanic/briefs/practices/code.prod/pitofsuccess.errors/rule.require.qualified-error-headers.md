# rule.require.qualified-error-headers

## .what

every error a human reads opens with its error class, qualified **exactly**, behind the
matching glyph:

```
✋ ConstraintError: <what went wrong>
💥 MalfunctionError: <what went wrong>
```

no other opener. not `ERROR:`, not `🛑 BLOCKED:`, not `⚠️`, not a bare message.

## .why

- **the glyph is scanned; the class is read** — a human spots ✋ vs 💥 at a glance, then reads
  the word to confirm. one channel for speed, one for certainty.
- **the class names WHO FIXES IT** — `ConstraintError` says *you*, `MalfunctionError` says *the
  system*. a header that omits the class makes every reader re-derive that from prose.
- **one vocabulary across ts and bash** — `helpful-errors` throws these two classes in
  typescript; a shell hook that says `ERROR:` speaks a second dialect for the same two ideas.
- **a glyph alone is ambiguous** — 🛑, ⚠️, and ✋ all read as "stop" to someone who has not
  memorized the table. the word removes the guess.

## .the two classes

| glyph | class | who fixes it | exit code |
|-------|-------|--------------|-----------|
| ✋ | `ConstraintError` | the caller — bad input, absent arg, forbidden content | 2 |
| 💥 | `MalfunctionError` | the system — broken config, failed write, unexpected state | 1 |

## .the test

"can a human tell, from the first line alone, whether THEY must act?"

- yes → the class is there
- no → qualify it

## .how

### in typescript — throw the class

```ts
import { ConstraintError, MalfunctionError } from 'helpful-errors';

throw new ConstraintError('customer lacks phone', { customerId });
throw new MalfunctionError('database connection failed', { host });
```

⚠️ import from `helpful-errors`, never `test-fns` — see `rule.require.exit-code-semantics`.

### in bash — spell the header yourself

bash has no class to throw, so the header carries the whole contract:

```bash
echo "✋ ConstraintError: no --spot supplied" >&2
exit 2

echo "💥 MalfunctionError: could not write the nudge file" >&2
exit 1
```

## 🔴 .the PreToolUse exception — the GLYPH moves, the EXIT CODE does not

a claude-code PreToolUse hook inverts the usual exit-code table:

| exit | claude code reads it as |
|------|-------------------------|
| 2 | **blocked** |
| anything else | **permitted** |

⇒ a malfunction in a PreToolUse hook must **still exit 2**, or the gate it guards fails OPEN
and the forbidden thing lands with no signal. label it `💥 MalfunctionError:` so the human
knows the cause is the system — and keep `exit 2` so the gate holds.

```bash
# a malfunction, in a PreToolUse hook
echo "💥 MalfunctionError: the blocklist holds a term that is not a valid regex" >&2
exit 2    # ← NOT 1. exit 1 would permit the write.
```

**this is the one place the glyph and the exit code disagree, and it is deliberate.** a
reader who "corrects" the 2 to a 1 here opens the gate.

## .examples

### 👎 bad — the class is absent

```bash
echo "ERROR: PreToolUse hook received no input via stdin" >&2
echo "🛑 BLOCKED: forbidden term(s) detected in file write" >&2
echo "⚠️  HARDNUDGE record NOT saved" >&2
```

three openers, three glyphs, and not one says who must act.

### 👍 good — qualified, exactly

```bash
echo "✋ ConstraintError: PreToolUse hook received no input via stdin" >&2
echo "✋ ConstraintError: forbidden term(s) detected in file write" >&2
echo "💥 MalfunctionError: HARDNUDGE record NOT saved — could not update the nudge file" >&2
```

## .what follows the header

the header names the class; `rule.require.errors-name-the-fix` (ergonomist) governs the rest —
what, why, and the concrete next move:

```
✋ ConstraintError: forbidden term(s) detected in file write

file: deploy.sh

detected terms:
  ⛔ leverage → consider: use

fix: reword it, or retry the same operation to override.
```

## .enforcement

- an error header with no `ConstraintError:` / `MalfunctionError:` qualifier = **blocker**
- a qualifier misspelled, abbreviated, or paraphrased (`Constraint:`, `MALFUNCTION`) = **blocker**
- the wrong glyph for the class (💥 on a constraint, ✋ on a malfunction) = **blocker**
- 🔴 a PreToolUse hook that exits 1 on a malfunction = **blocker** (it fails open)

## .see also

- `rule.require.exit-code-semantics` — the exit codes these classes carry
- `rule.require.failloud` — the context an error must hold beyond its header
- `rule.require.errors-name-the-fix` (ergonomist) — what follows the header
- `rule.require.skill-output-streams` — which stream each case goes to

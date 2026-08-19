# rule.require.coconut-hints

## .what

when a cli render hands the human a **next move** — a command to run, a flag to add, a way to
recover — that guidance renders as a **coconut hint**: a `🥥` header, then treestruct lines.

```
🥥 did you know?
   ├─ you can restore from trash
   └─ rhx cpsafe .agent/.cache/trash/notes.md ./notes.md
```

the coconut marks exactly one sense: **this block is optional guidance you may act on**. it
is not the error, not the result, not the status. it is the way forward.

## .scope — this repo only

this is a house style, not a universal one. it lives in `.agent/repo=.this/` because it is
bound to `print_coconut_hint`, a helper in this repo's own `git.commit/output.sh`, and to a
turtle-themed emoji vocabulary no other repo shares
(`rule.prefer.internal-briefs-location`).

the DEMAND beneath it IS universal — an error must carry its remedy, and that remedy must be
found at a glance. that demand is `rule.require.errors-name-the-fix` (ergonomist), and it is
what a repo without coconuts should satisfy in its own idiom. this rule fixes the shape that
demand takes HERE.

## .why

- **the eye finds it.** an error render is a wall of text at the exact moment a human is
  frustrated. a `🥥` is a landmark: the reader's eye jumps to it, so the fix is what they
  read first rather than what they hunt for last.
- **one glyph, one sense.** this repo already leans on emoji as semantic markers — `🐢` for a
  turtle header, `💥` for a malfunction, `🔐` for a locked key. a hint with no marker is the
  one kind of block a reader must parse prose to classify (`rule.forbid.ambiguous-labels`).
- **it separates advice from verdict.** an error says what IS; a hint says what you MAY do.
  run together as unmarked prose, a reader cannot tell which lines are the diagnosis and which
  are the remedy — so they read all of it, or none of it.
- **it makes the fix scannable.** `rule.require.errors-name-the-fix` demands every error carry
  its remedy. this rule governs the SHAPE that remedy takes, so a human finds it at a glance
  rather than by a careful read.

## .the anatomy

```
                          <- blank line separates the hint from the render above
🥥 did you know?          <- the coconut header
   ├─ <what you can do>   <- the affordance, in plain words
   └─ <the exact command> <- copy-pasteable, no placeholder the reader must decode
```

- **the blank line is required** — the hint is a distinct block, not a tail of the error
- **the header is `🥥 did you know?`** — one phrasing, everywhere (`rule.require.ubiqlang`)
- **the body is treestruct** — `├─` for each line, `└─` for the last
  (`rule.require.treestruct-output`)
- **the last line is the command** — what the human copies; it closes the block because it is
  what they act on

## .when it applies

| render carries... | coconut? |
|---|---|
| a command the human may run next | ✅ yes |
| a flag to add, or a valid set to choose from | ✅ yes |
| a recovery path (restore, unlock, re-run) | ✅ yes |
| the error itself (what went wrong, and why) | ❌ no — that is the `error:` line |
| the result of a successful operation | ❌ no — that is the result tree |
| a status or progress line | ❌ no |

the error and the hint are two different jobs. the `error:` line names the fault; the coconut
block names the move. a render may carry both, and when it does, the fault comes first.

## .examples

### 👎 bad — the fix is prose, indistinguishable from the diagnosis

```
🐢 bummer dude

🐚 git.repo.get lines
   ├─ repos: testorg/*
   └─ error: --tree cannot be combined with --repos

   a worktree belongs to one repo. select that repo with --in:
     $ rhx git.repo.get lines --in <org>/<repo> --tree feat/inflight
```

the last two lines carry the whole remedy, and no marker says so. a reader who scans for
"what do i do now" has to read the prose to learn that it is the answer.

### 👍 good — the coconut marks the move

```
🐢 bummer dude

🐚 git.repo.get lines
   ├─ repos: testorg/*
   └─ error: --tree cannot be combined with --repos

🥥 did you know?
   ├─ a worktree belongs to one repo, so name it with --in
   └─ rhx git.repo.get lines --in <org>/<repo> --tree feat/inflight
```

the fault and the fix are two blocks. the eye lands on `🥥` and reads the command.

### 👍 good — a recovery path

```
🥥 did you know?
   ├─ you can restore from trash
   └─ rhx cpsafe .agent/.cache/trash/notes.md ./notes.md
```

## .the caveat

a hint is **optional guidance**, so it must never carry information the render needs to be
correct. if a human MUST know something for the output to make sense, it belongs in the render
itself — a branch, or the `error:` line — not in a block styled as a friendly aside.

## .enforcement

- a cli render that names a next-move command as unmarked prose = **nitpick**
- a coconut block that omits the blank line, the `🥥 did you know?` header, or the treestruct
  body = **nitpick**
- a coconut block that carries load-bearing information (not optional guidance) = **blocker**

## .see also

- `rule.require.errors-name-the-fix` — an error MUST carry its remedy; this rule shapes it
- `rule.require.treestruct-output` — the tree shape the hint body takes
- `rule.require.discoverability` — surface the options rather than rely on recall
- `rule.prefer.chill-nature-emojis` (mechanic) — the emoji vocabulary this draws from

# rule.require.help-on-demand

## .what

a surface must explain itself on demand. every command carries `--help` (and a `-h`
alias) that states what it does, its inputs, and a worked example — so a human never has
to read source or hunt a wiki to use it.

grounds the *intuitive* quality of `def.ergonomic` and the *no undiscoverable step* line
of `def.frictionless`. from nielsen's heuristic 10, **help and documentation**
(`ref.ergonomics.fundamentals`).

## .why

- the moment a human reaches for help is the moment the surface must answer — not a wiki,
  not the source, not a maintainer
- `--help` is the one place a human always looks; if it is absent or thin, the human
  guesses, and a guess is friction
- help carried by the surface stays in sync with the surface; help in a separate doc drifts

## .the test

"can a human learn to use this from `--help` alone, without a question or a source read?"

- yes → self-explanatory
- no → fill the help

## .what good help holds

1. **.what** — one line: what the command does
2. **usage** — the shape of the call, with required vs optional inputs marked
3. **inputs** — each flag/arg, its sense, and its default
4. **examples** — at least one copy-paste invocation for the common case

## .examples

### 👎 bad — help is absent or a stub

```bash
$ booklesson --help
booklesson: options: --surfer --spot --board
# what do they take? which are required? what does a real call look like?
```

### 👍 good — help teaches the command

```bash
$ booklesson --help
🐢 booklesson — reserve a surf lesson for a surfer at a spot

  usage:
    booklesson --surfer <name> [--spot <spot>] [--board <board>]

  inputs:
    --surfer   who the lesson is for            (required)
    --spot     surf spot                        (default: nearest open)
    --board    foamboard|longboard|shortboard   (default: foamboard)

  example:
    booklesson --surfer kai --spot trestles --board longboard
```

## .enforcement

- a command with no `--help` (or `-h`) = **blocker**
- a `--help` that omits usage, inputs, or an example = **blocker**
- help that points to source or an external wiki instead of a note on the command = **blocker**

## .see also

- `ref.ergonomics.fundamentals` — help and documentation (nielsen 10)
- `rule.require.discoverability` — the same "surface the knowledge" move, before the ask
- `rule.require.treestruct-output` — the shape help text takes
- `def.frictionless` — the *no undiscoverable step* line this backs

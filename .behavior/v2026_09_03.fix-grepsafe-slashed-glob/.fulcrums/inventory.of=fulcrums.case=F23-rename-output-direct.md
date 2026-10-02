# F23 — rename `--output direct`? the label carries no sense

- **rework**: clean (code) · dirty (round) — a flag rename that breaks callers across two skills
- **status**: ✅ ruled 2026-09-24 — option B, `pipeable`. my deferral and my `data` pick overruled
- **confidence**: 80% that `direct` was wrong · 62% on the replacement → ruled
- **raised**: by the wisher, 2026-09-24
- **where**: `grepsafe.sh` + `globsafe.sh`, and every test and snapshot that names the value

## .the wisher's question

> *"and should we just call it `--output pipeable` instead of `--output direct`, to be clearer?"*

## .the premise holds

`rule.forbid.ambiguous-labels`: can a human read this one way without context? `direct` — as opposed
to what? the real contrast is "without the turtle frame", and no reader infers that. F20 spent six
review rounds on whether errors belong on that mode's stdout; a label that named the mode's purpose
answers it on sight.

## .the fork

| option | pair | axis |
|--------|------|------|
| A — hold `direct` | `vibes` / `direct` | none coherent |
| **B — `pipeable`** (ruled) | `vibes` / `pipeable` | feel vs use |
| C — `plain` | `vibes` / `plain` | look, both sides |
| D — `data` (my pick) | `vibes` / `data` | what stdout carries |

my objections to B: both modes can be piped, so the label seemed not to discriminate; and it mixes a
look axis with a use axis. i also deferred the rename: it breaks a public flag across two skills, and
an alias would be a synonym (`rule.forbid.term.addition.synonym`).

## .the verdict

> *"yep, cutover to pipeable, since obviously the data is pipeable"*

this mode's stdout **is** the data, so `pipeable` names the payload and says what a caller may do
with it — the live question at the moment of choice. `rule.forbid.ambiguous-labels` asks that a label
read one way, not that a pair share a grammatical axis. i priced the word; the wisher priced the
reader.

## .what landed

| surface | change |
|---|---|
| `grepsafe.sh` · `globsafe.sh` | the flag value, every comparison, help text, refusal text |
| both test suites | every invocation, `when()` label, temp-dir slug, `PIPEABLE_ZERO` const |
| both snapshot files | every key and body — hand-edited, not resnapped |

`--output direct` sits in no permission allowlist (checked `src/domain.roles/mechanic/inits`).

the old value gets a named migration, via F15's coconut:

```
$ rhx grepsafe --pattern 'grepsafe' --output direct
error: --output direct was renamed to pipeable
  got: direct

🥥 did you know?
   ├─ pass --output pipeable — same behavior, current name
   └─ grepsafe.sh --pattern 'paddleOut' --output pipeable
```

exit 2. a caller who still passes `--output direct` gets a loud migration note, not a silent break.

had F15 stayed deferred, the break would have shipped a bare `error:` line with no pointer to the
replacement.

the rename also exposed a latent help defect: `--output vibes|direct` inlined its values where every
peer flag uses a metavar. both skills now read `--output MODE      vibes|pipeable (default: vibes)`.
`globsafe`'s `--sort name|time|size` carries the same shape and is left, with a comment at the site.

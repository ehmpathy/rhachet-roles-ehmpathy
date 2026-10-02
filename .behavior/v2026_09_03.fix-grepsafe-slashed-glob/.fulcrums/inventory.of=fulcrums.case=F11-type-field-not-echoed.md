# F11 — `--type` is not echoed as a labeled field

- **rework**: clean
- **status**: 🔴 settled — take it. my deferral reversed, by me
- **confidence**: 70% → self-reversed
- **raised**: by peer lane `r010`
- **where**: `grepsafe.sh` — `print_grepsafe_header`

## .the fork

every render opens with `pattern` / `path` / `glob` / `engine`. `--type` changes which files are
searched and was never shown.

| take it | leave it |
|---|---|
| a caller who passes `--type ts` gets no confirmation it applied | a new field widens user-faced surface |
| `--glob` is echoed, so one filter shows while its twin hides | four `[case32]` snapshots re-baseline |
| one line in `print_grepsafe_header` | the zero-kind line already names the type when it is the cause |

## .my first call, and why it lost

left it, on the wish's *"do not widen grepsafe's surface"*.

- a header whose purpose is *"here is what i ran"*, which omits one of two active filters, asserts a
  scope that is not the scope. same class as F10's label and the route's false zero.
- my rebuttal — the refusal's `fix:` line already names `--type` — answered the refusal path.
  `r010`'s point was the success path, where a caller most wants confirmation.
- *"one line of provenance"* is the wish's own sanctioned addition, and this is one line of
  provenance.

## .the verdict

**take it.** `print_grepsafe_header` emits `type:` beside `glob:` on the same `[[ -n ]]` shape.
`[case32]` resnapped. a success-path `--type` clamp added — the shape had no test beyond a
`toContain('a.sh')`.

# ref.ergonomics.fundamentals

## .what

the established, cited canon the ergonomist grounds in. when a rule below claims a
surface is "intuitive" or "unambiguous" or "safe", the claim traces to one of these
fundamentals — not to taste. read this to know *why* the rules are the rules.

these are the human-factors principles behind fit-to-human contracts. they predate any
one interface style (gui, cli, api, sdk) and translate across all of them — an
ergonomist applies the *principle*, not the gui form it was first written for.

## .the canon

### principle of least astonishment (pla)

> a component of a system should behave in a way that most users expect; the behavior
> should not astonish or surprise.

the oldest and broadest: when behavior surprises, the interface failed, not the human.
backs `rule.forbid.surprises`.

### norman's principles (*the design of everyday things*, don norman)

the vocabulary of fit-to-human design:

- **affordance** — what an object lets you do (a handle affords a pull)
- **signifier** — the perceptible cue that reveals the affordance (the label on the door)
- **intuition** — a control's relationship to its effect matches expectation, so the
  obvious guess is the right one; the natural control corresponds to the natural result
  (norman's principle of natural control-to-effect correspondence)
- **feedback** — every action yields a visible, immediate response
- **constraint** — the design makes the wrong action hard or impossible
- **conceptual model** — the human's mental model matches how the system actually works
- **discoverability** — a human can find what actions are possible without a manual

> two gulfs sit between a human and a system: the **gulf of execution** (can i figure out
> how to use it?) and the **gulf of evaluation** (can i tell what it did?). good design
> bridges both.

backs `rule.require.discoverability`, `rule.require.status-feedback`,
`rule.require.safe-by-default`, and — via **intuition** — `rule.forbid.ambiguous-labels`.

### nielsen's 10 usability heuristics (jakob nielsen, 1994)

the most-cited testable checklist in the field. the ones the ergonomist leans on:

1. **visibility of system status** — the system keeps the human informed via timely feedback
2. **match between system and the real world** — speak the human's words, not the machine's
3. **user control and freedom** — offer an "undo"/exit from mistakes
4. **consistency and standards** — same word, same action, everywhere
5. **error prevention** — design out the error before it needs a message
6. **recognition rather than recall** — show the options; don't make the human remember them
7. **flexibility and efficiency of use** — defaults for novices, accelerators for experts
8. **aesthetic and minimalist design** — every extra unit of noise competes with the signal
9. **help users recognize, diagnose, and recover from errors** — errors name the fix
10. **help and documentation** — discoverable when needed

backs `rule.require.status-feedback`, `rule.require.errors-name-the-fix`,
`rule.forbid.ambiguous-labels`, `rule.prefer.defaults-match-common-case`,
`rule.prefer.prevent-over-correct`, `rule.require.help-on-demand`.

### pit of success (rico mariani / brad abrams, .net framework)

> a well-designed system makes it easy to do what's right and irksome (not impossible)
> to do what's wrong. the human falls into correct usage.

the safe path is the easy path. backs `rule.require.safe-by-default`.

### cognitive load (miller 7±2; hick's law)

- **miller's law** — short-term memory holds ~7±2 items; a contract that demands the human
  juggle more will drop some
- **hick's law** — decision time grows with the number of choices; fewer, well-ordered
  options are faster to act on

backs `rule.prefer.defaults-match-common-case` and the minimalism behind
`rule.require.treestruct-output`.

## .how the canon maps to our rules

| fundamental | ergonomist rule |
|-------------|-----------------|
| least astonishment | `rule.forbid.surprises` |
| discoverability / recognition-over-recall | `rule.require.discoverability` |
| visibility of system status / feedback | `rule.require.status-feedback` |
| error recovery (heuristic 9) | `rule.require.errors-name-the-fix` |
| pit of success / constraints | `rule.require.safe-by-default` |
| consistency / intuition (unambiguous control-effect match) | `rule.forbid.ambiguous-labels` |
| minimalism / sensible defaults / cognitive load | `rule.prefer.defaults-match-common-case` |
| error prevention (heuristic 5) | `rule.prefer.prevent-over-correct` |
| help and documentation (heuristic 10) | `rule.require.help-on-demand` |
| minimalist, scannable output | `rule.require.treestruct-output` |

## .see also

- `def.ergonomic` — the scorable definition these fundamentals ground
- `def.frictionless` — the path-walkthrough definition these fundamentals ground
- `define.why-ergonomist-not-designer` — why this role, cited from the same literature

## .sources

- [Principle of least astonishment](https://en.wikipedia.org/wiki/Principle_of_least_astonishment)
- [Don Norman, *The Design of Everyday Things*](https://en.wikipedia.org/wiki/The_Design_of_Everyday_Things)
- [Jakob Nielsen, 10 Usability Heuristics](https://www.nngroup.com/articles/ten-usability-heuristics/)
- [Rico Mariani / Brad Abrams on the pit of success](https://blog.codinghorror.com/falling-into-the-pit-of-success/)
- [Miller's law (7±2)](https://en.wikipedia.org/wiki/The_Magical_Number_Seven,_Plus_or_Minus_Two)
- [Hick's law](https://en.wikipedia.org/wiki/Hick%27s_law)

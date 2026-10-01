# F7 · add a `files: N` branch, so the two honest zeros read apart

- **rework**: clean
- **status**: ✅ ruled 2026-09-08 — yes. acceptance 7 adopted, on the trait
- **confidence**: 75% → ruled

## .the fork

after the repair, a zero can say two things, and both rendered `matches: 0`:

| reason | what it says |
|--------|--------------|
| the glob selected files; the pattern matched none | a real search, a real absence |
| the glob selected no file | the question was never asked |

| option | shape |
|--------|-------|
| **A (taken)** | the output carries evidence of files scanned, plus a coconut hint on an empty glob |
| B | leave it; a zero is a zero |
| C | a distinct exit code for the empty-glob case |

## .taken, and why

**A.** B re-creates the wish's defect one layer down: an empty glob **is** "I could not ask the
question", so a bare `matches: 0` for it is the same ambiguity by a new route.

C breaks every caller that reads exit 0 as "the search ran", and `rule.require.exit-code-semantics`
reserves 2 for caller-must-fix. an empty glob is a valid question with a valid empty answer.

A adds no flag and changes no input. it is the move acceptance 4 already makes: the answer carries
what it did. `engine:` says who looked; the file evidence says how much was looked at.

## .what it carries

acceptances 1–6 rest on other repairs. F7 alone carries the wish's thesis — *"a false `0` is
indistinguishable from a true one"*. decline it and every listed criterion passes while the first
sentence of the wish stays true for the empty glob.

## .acceptance 7 — adopted

> every zero `grepsafe` can emit is **legible apart from every other zero it can emit**, from the
> answer alone, with no second command.
>
> | the zero | what the output must carry |
> |----------|----------------------------|
> | files selected, pattern matched none | evidence that files were scanned |
> | glob selected no file | evidence that no file was scanned, plus the next command to run |
> | no glob, pattern matched none | the same evidence as the first row |
>
> clamp: run the first two shapes and assert their outputs **differ**. a test that asserts
> `matches: 0` in both passes under the defect.

written on the trait, never on `files: N`, so a boolean or a worded line satisfies it unchanged.

## .confidence — 75%

- high that the ambiguity is real: measured, and the wish's own complaint
- lower on the shape: a worded line may read better than a count
- lowest on cross-engine agreement of the count — moot once F9 left one engine

## .where

- `1.vision.experience.case=2.empty-expansion-hang.md`
- `1.vision.experience.case=6.true-zero-reads-true.md`

## .verdict

✅ **ruled 2026-09-08 — yes.** acceptance 7 adopted, on the trait.

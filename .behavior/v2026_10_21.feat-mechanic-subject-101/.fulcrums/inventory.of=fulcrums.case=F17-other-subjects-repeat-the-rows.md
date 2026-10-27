# F17 — every other subject repeats the rows that leave `always`

## the fork

a row out of `always` must still boot for every seat that is not 101.

options:
- A. repeat each row in every other subject (code.prod, code.test, arch, flow) — wet over dry
- B. put each row in one subject only — a single-subject boot of another subject loses it
- C. add a shared section — rhachet has no such key

## taken, and why

A, per the director (2026-10-22): "every other subject boots exactly as today. repeat the lines in
boot.yml; wet over dry, and no other boot moves in this PR."

measured (dist view, same spec dir, pre-cut vs cut):

| boot | pre-cut | cut |
|---|---|---|
| `--subject code.prod` | 20,426 | 20,426 |
| `--subject code.test` | 13,075 | 13,075 |
| `--subject arch` | 10,201 | 10,201 |
| `--subject flow` | 12,455 | 12,455 |

same tokens, same content; the moved rows boot after the rest of `always` rather than among it.

## rework

clean — the rows are plain lines; a later rhachet shared section can replace the four copies.

## confidence, and why it is low

85%. four copies drift if one is edited alone; `boot.yml.integration.test.ts` pins every copy, so a
drift fails red.

## where

`src/domain.roles/mechanic/boot.yml`; clamp in `boot.yml.integration.test.ts`.

## verdict

ruled 2026-10-22 by the director: taken as best-guessed.

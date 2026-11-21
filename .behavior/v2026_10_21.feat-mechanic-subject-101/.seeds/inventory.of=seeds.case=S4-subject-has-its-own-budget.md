# S4 — the subject owns a budget apart from the role

## .said

> shouldnt the subject have a different budget?

(review comment on pr #1065, anchored on `blackbox/__snapshots__/mechanic.subject.101.acceptance.test.ts.snap` line 43, the `budget = 30,000 tokens` readout of `roles cost --subject 101`)

## .settled

yes: each 101 has its own cap (mechanic 10k, architect 6k, ergonomist 3.5k). rhachet through 1.53.0 refuses `budget:` inside a section and grades `--subject` against the role budget, so the caps live in `boot.budget.integration.test.ts`. a per-subject budget is asked of rhachet.

## .landed

| where | what |
|---|---|
| `src/domain.roles/boot.budget.integration.test.ts` | `SUBJECT_BUDGETS` holds one cap per 101 |
| `.radio/` | held task to ehmpathy/rhachet: a subject section declares its own budget |

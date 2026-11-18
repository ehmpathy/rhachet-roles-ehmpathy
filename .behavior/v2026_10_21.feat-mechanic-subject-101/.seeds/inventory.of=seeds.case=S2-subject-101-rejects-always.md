# S2 — subject.101 rejects always

## .said

> no. subject.101 can just reject always. check the latest from rhachet release on how to use the focus boots.
>
> there should be pretty much no change here other than the addition of the new subject

(review comment on pr #1065, anchored on `src/domain.roles/mechanic/boot.yml`, the note that moved rows out of `always`)

## .settled

`subject.101` declares `inherit: { always: false }`. `boot.yml` equals main's file plus the one new subject: `always` and every other subject keep main's rows. the 10k cap stays in `boot.budget.integration.test.ts`, since rhachet still refuses a `budget:` inside a section.

## .landed

| where | what |
|---|---|
| `src/domain.roles/mechanic/boot.yml` | main's rows + `subject.101` with `inherit: { always: false }` |
| `src/domain.roles/boot.budget.integration.test.ts` | caps the 101 boot alone; the union row retired |
| `src/domain.roles/mechanic/boot.yml.integration.test.ts` | pins the opt-out; the held-out-of-always rows retired |

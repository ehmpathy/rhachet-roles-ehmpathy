# self-review: has-questioned-questions (r4)

## for: 1.vision

---

## issue found

the "questions to validate" section listed two questions but did not mark them as resolved:

```markdown
### questions to validate

1. **is `--into` the right term?** alternatives: `--to`, `--target`. ...

2. **should `--apply` be the default alias?** we add it as alias ...
```

these were written as prose explanations but not tagged with a resolution status.

---

## fix applied

updated the vision document to mark both questions as [answered]:

```markdown
### questions to validate

1. **is `--into` the right term?** [answered]
   - alternatives: `--to`, `--target`
   - resolution: `--into` is correct — the wisher explicitly requested ...

2. **should `--apply` be the default alias?** [answered]
   - resolution: yes — the wisher explicitly requested ...
```

---

## why this matters

the guide says: "for each question, ensure it is clearly marked as either: [answered], [research], or [wisher]"

without explicit tags, a future reader cannot tell whether these are open questions or resolved decisions. the tags make the status unambiguous.

---

## verification

re-scanned the entire vision for other untagged questions:

- lines 312-332: "open questions & assumptions" — now properly tagged
- lines 336-361: "what is awkward?" — these are observations, not questions; no tags needed
- all other "?" marks are rhetorical or in example output

---

## conclusion

the vision now properly enumerates all questions with explicit resolution status:
- question 1 (`--into`): [answered]
- question 2 (`--apply`): [answered]
- external research: none needed

no [research] or [wisher] questions remain.


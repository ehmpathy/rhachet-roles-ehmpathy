# F1 — pin above the largest measure

- fork: pin at next 1,000 above (a) the consumer view alone (linked) or (b) the largest of src and linked
- taken: (b). neither view bounds the other (mechanic: src 66,338 > linked 65,126; architect: linked 17,300 > src 17,246), and `roles cost --all` sweeps both. the test grades both views
- rework: clean — one number per boot.yml
- confidence: 85% — the wish says "its measure", singular; several views exist, and the wish names none
- where: `src/domain.roles/{mechanic,architect,ergonomist}/boot.yml`
- verdict: awaited

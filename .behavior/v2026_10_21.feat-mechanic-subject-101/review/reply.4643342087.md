yes. it does have one, but rhachet cannot hold it yet, so the readout you flagged shows the role's.

- **the cap 101 has**: 10k, in `SUBJECT_BUDGETS` in `src/domain.roles/boot.budget.integration.test.ts`, which costs the section alone and fails, named, past the cap
- **why not in boot.yml**: rhachet through 1.53.0 (the latest, 2026-11-19) still refuses `budget:` inside a section (`parseRoleBootSpecFromRaw`: "a budget caps the whole payload, so it belongs at the top level"), and `roles cost --subject 101` grades the seat against the top-level budget. that is the `budget = 30,000 tokens` on line 43
- **the fix at the source**: dispatched to ehmpathy/rhachet, "feat(boot): a subject section declares its own budget, and roles cost --subject grades against it". it asks that `budget:` be accepted on a `subject.*` section, that `--subject` cost and boot grade against it, and that `repo introspect` halt on it. held at the global radio gate; `rhx radio.uses --global allow` delivers it
- once rhachet ships it, each cap moves out of the test into its `subject.101`, and this snapshot reads the subject's budget

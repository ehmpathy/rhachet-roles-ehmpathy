# F35 — the merged dryrun rule says APPLY, not EXECUTE

- **the fork**: the two dryrun rules merged into `rule.forbid.term=dryrun`. their examples named the active mode `EXECUTE` and the cli flag `--execute`. (a) keep the examples verbatim; (b) move them to `APPLY` and `--mode apply`.
- **taken**: (b).
- **why**: the blocklist record's alt and every mechanic skill say `--mode plan` / `--mode apply`; an example that teaches `EXECUTE` contradicts the hook that cites it.
- **rework**: clean — two words in one example file.
- **confidence**: 90%. the residual: the moved examples are no longer verbatim.
- **where**: `src/domain.roles/mechanic/briefs/practices/lang.terms/rule.forbid.term=dryrun.example=demo.md`
- **verdict**: open

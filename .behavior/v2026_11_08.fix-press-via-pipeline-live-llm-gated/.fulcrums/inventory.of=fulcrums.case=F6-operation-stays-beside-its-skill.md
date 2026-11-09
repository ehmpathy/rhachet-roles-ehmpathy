# F6: pressViaPipeline stays at its extant path, beside the one skill it serves

- fork: move `pressViaPipeline` and its tests to `src/domain.operations/press/` · leave it at `src/domain.roles/librarian/skills/brief.condense/domain.operations/press/`
- taken: leave it. `rule.forbid.logic-in-role-dirs` places an operation by what it serves; its table row reads "one skill → beside that skill". pressViaPipeline has one caller, `brief.condense.ts`, so it sits beside that skill. the path predates this diff on main, next to four other operations of the same skill (`supply/`, `verify/`). the new unit test sits beside its subject, as `rule.require.test-coverage-by-grain` places tests
- the move alone is not clean. pressViaPipeline imports `compressViaBhrain` and `countTokens`, both under `src/domain.roles/librarian/skills/brief.compress/`. no file in `src/domain.operations/` imports from `src/domain.roles/` today (grep: 0 matches). so a move of pressViaPipeline alone would add the first upward import (`rule.require.directional-deps`). a clean move takes the compressors along, and they have about 10 callers across two skills. that is the librarian's whole op layer, caught as `dreams/2026_11_08.fix-librarian-operations-out-of-role-dir.dream.md`
- rework: dirty past this diff (a cross-skill relocation); clean for this diff's own lines, which move with the set
- confidence: 90%
- where: `src/domain.roles/librarian/skills/brief.condense/domain.operations/press/`
- verdict: open

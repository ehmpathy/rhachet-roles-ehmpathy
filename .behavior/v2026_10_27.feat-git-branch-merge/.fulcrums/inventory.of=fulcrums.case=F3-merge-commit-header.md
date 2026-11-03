# F3 — merge commit header

- **fork**: (a) git's default `Merge … 'origin/main' into …` subject (commitlint ignores it) · (b) conventional `cont(branch): merge origin/main into <branch>` · (c) caller supplies `-m @stdin`
- **taken**: (b). `rule.require.commit-scopes` asks type(scope) on every commit; `cont` = progress within a pr; no message burden on the clone
- **rework**: clean. one string; (c) can be added later as an override
- **risk**: low. the header lives only on the pr branch; this repo is squash-only, so it never reaches main. if wrong, a later release changes one string with no caller impact
- **confidence**: 85%
- **where**: `1.vision.yield.md` Q3
- **verdict**: open

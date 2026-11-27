# F22 — the `.agent/keyrack.yml` driver extends line and the `package.json` role bumps ride along

- **the fork**: r11 (i003) flags `.agent/keyrack.yml`, which gains `- .agent/repo=bhrain/role=driver/keyrack.yml` under `extends`, as a possible scope leak. r10 (i004) flags `package.json`: devDeps `rhachet` 1.50.0 → 1.50.1, `rhachet-brains-openrouter` 0.1.3 → 0.1.4, `rhachet-roles-ehmpathy` 1.39.7 → 1.39.9, plus `playwright` and `rhachet-roles-bhrowser` added. (a) keep them; (b) split them out of this change.
- **taken**: (a) keep.
- **why**: none is authored lesson content. the keyrack line is generated: rhachet links each enrolled role's keyrack into `extends`; this route enrolled the bhrain driver to drive its stones, so the link appeared with it, and a revert would return on the next `rhx init`. the three version bumps are patch-level rhachet and role upgrades of devDeps the route's tools run on. `playwright` and `rhachet-roles-bhrowser` came in for the citation fetches the wisher asked for ("literally use the bhrowser"); the bhrowser role needs `playwright` as a direct dep (`dreams/v2026_11_23.reseed.bhrowser-needs-playwright-as-a-direct-dependency.md`). `rule.require.git-release-confidence` (mechanic) names rhachet and role package bumps and `.agent/keyrack.yml` among the routine bumps in scope by default; it says to stop only for a secret value, a downgrade, or a suspicious pin, and none is here. each is pinned exact (`rule.require.pinned-versions`).
- **rework**: clean — drop the line or the devDeps, if the wisher prefers a separate change.
- **confidence**: 90%.
- **where**: `.agent/keyrack.yml`; `5.1.execution.from_vision` review r11 nitpick.5
- **verdict**: **ruled by the wisher (chat, 2026-11-24)**: the bumps ride along — *"yes, include everything"*

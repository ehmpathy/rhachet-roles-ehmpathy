# F11: no PreToolUse hook to enforce the caller's shell limit

- fork: add a hook (a peer of `pretooluse.forbid-test-background.sh`) that denies a `git.repo.test` Bash call whose own `timeout` is under the bound plus a margin, or leave the caller's clock to the briefs
- taken: leave it to the briefs (published howto line + internal note), and ask the wisher. such a hook changes every caller's workflow in every repo that enrolls the role: claude code's Bash default is 120s, so every `rhx git.repo.test` call that omits a `timeout` would be denied until the caller passes one. that is a policy call on how clones work, beyond this wish's "a run halts past 5 minutes"
- the gap is real: with the harness default, a 2-5 minute suite dies at 120s by the harness, and the "too slow" lesson never shows. caught as `dreams/v2026_11_22.feat.hook-callers-clock-above-the-bound.md` with the hook's shape
- rework: clean. a new hook file, its registration, its test; the skill does not change
- confidence: 75%
- where: `src/domain.roles/mechanic/inits/claude.hooks/`
- verdict: open, [wisher]

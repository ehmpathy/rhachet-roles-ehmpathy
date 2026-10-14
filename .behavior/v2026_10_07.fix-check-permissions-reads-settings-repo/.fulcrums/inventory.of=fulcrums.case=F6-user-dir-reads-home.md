# F6 — user layer reads $HOME/.claude/settings.json when $CLAUDE_CONFIG_DIR is unset

- **fork**: (a) user layer = config dir only (`$CLAUDE_CONFIG_DIR`, else the walk-up dir) · (b) user dir = `$CLAUDE_CONFIG_DIR`, else `$HOME/.claude`, as claude resolves it
- **taken**: (b). under (a), a human's home allow (claude honors it) is still blocked by the hook on the old layout. the wish says "never blocks a command claude would allow"
- **rework**: clean — one path variable
- **confidence**: 85%. the gap predates the wish, so this widens what the hook passes, beyond the reported defect
- **where**: `1.vision.yield.md` .the contract
- **verdict**: —

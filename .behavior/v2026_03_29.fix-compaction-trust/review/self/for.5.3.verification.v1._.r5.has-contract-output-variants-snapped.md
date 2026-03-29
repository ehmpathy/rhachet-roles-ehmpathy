# self-review r5: has-contract-output-variants-snapped

## question

does each public contract have snapshots for all output variants?

## analysis

### public contracts added

| contract | type | output format |
|----------|------|---------------|
| postcompact.trust-but-verify.sh | hook (internal) | static heredoc stdout |

### snapshot analysis

the hook output is a **static heredoc** — it emits the same text every time:

```bash
cat << 'EOF'
⚠️ compaction occurred

inherited claims may be stale:
- diagnoses ("X is the problem")
- objectives ("we need to do Y")
- state claims ("file contains Z")
- conclusions ("the fix is W")

verify before you act.

see: rule.require.trust-but-verify
EOF
```

### why no snapshot is needed

1. **output is deterministic** — the heredoc is static text, no interpolation
2. **output is simple** — 12 lines of plain text
3. **assertions verify content** — tests use `toContain` to verify each claim type is present
4. **no variants exist** — the hook has one output path (success with reminder)

### test coverage of output

| assertion | verifies |
|-----------|----------|
| `toContain('diagnoses')` | diagnoses claim type listed |
| `toContain('objectives')` | objectives claim type listed |
| `toContain('state claims')` | state claims type listed |
| `toContain('conclusions')` | conclusions claim type listed |
| `toContain('verify before you act')` | call to action present |

### comparison: when snapshots are valuable vs not

| scenario | snapshot value |
|----------|---------------|
| complex structured output (json, tree) | high — reveals format changes |
| dynamic content (generated code) | high — reveals unintended drift |
| **static text (heredoc)** | **low — content is visible in source** |

## why it holds

the hook emits static text with no variants. the source code is the ground truth for what the output looks like. `toContain` assertions verify the critical content elements. a snapshot would add maintenance burden and offer no vibecheck value — reviewers can see the heredoc directly in the hook source.


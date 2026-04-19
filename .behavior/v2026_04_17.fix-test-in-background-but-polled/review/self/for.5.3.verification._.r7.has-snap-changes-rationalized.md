# self-review r7: has-snap-changes-rationalized (deeper reflection)

## the story of this snapshot

i added an integration test for the hook. the test includes a snapshot assertion:

```typescript
then('block message matches snapshot', () => {
  const result = runHook({
    tool_name: 'Bash',
    tool_input: {
      command: 'rhx git.repo.test --what unit',
      run_in_background: true,
    },
  });
  expect(result.stderr).toMatchSnapshot();
});
```

this captures the exact stderr output when the hook blocks.

## line-by-line review of snapshot content

```
🛑 BLOCKED: git.repo.test must run in foreground
```
- **intentional:** clear status indicator
- **regression risk:** none - static text

```
background + poll wastes tokens (2500+ vs 50 from curated output).
```
- **intentional:** explains WHY blocked
- **regression risk:** numbers are static (not computed)

```
the skill is designed to minimize token consumption - foreground is required.
```
- **intentional:** states the rule
- **regression risk:** none - static text

```
fix: remove run_in_background from your Bash tool call
```
- **intentional:** actionable guidance
- **regression risk:** none - static text

```
instead of:
  Bash(command: 'rhx git.repo.test ...', run_in_background: true)

use:
  Bash(command: 'rhx git.repo.test ...')
```
- **intentional:** concrete before/after example
- **regression risk:** none - static text

## what could go wrong in future

| potential issue | risk | mitigation |
|-----------------|------|------------|
| message text changes | low | changes would require code edit, which triggers review |
| computed values added | low | current message is fully static |
| format changes | medium | snapshot would catch unexpected changes |

## why it holds

1. **new snapshot, not modified.** no prior behavior to regress.
2. **static content.** no timestamps, ids, or computed values.
3. **intentional structure.** emoji marker, explanation, guidance, example.
4. **reviewer can vibecheck.** snapshot shows exact output without execute.

## gaps found

none. the snapshot tells an intentional story.

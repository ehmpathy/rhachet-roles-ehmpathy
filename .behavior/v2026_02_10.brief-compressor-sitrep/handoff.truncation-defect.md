# handoff: brain output truncation defect

## symptom

when `brain.choice.ask` is invoked for brief compression via sitrep methodology, the output is sometimes severely truncated — it returns only a few tokens instead of the expected 200-500 token compressed brief.

## observed behavior

same input, same brain, same prompt — different outputs:

| run | brain | tokens.before | tokens.after | ratio | notes |
|-----|-------|---------------|--------------|-------|-------|
| 1 | anthropic/claude/sonnet | 885 | 8 | 110x | truncated to title only |
| 2 | anthropic/claude/sonnet | 885 | 312 | 2.8x | proper compression |

previously observed with `xai/grok/code-fast-1`:

| run | brain | tokens.before | tokens.after | ratio | notes |
|-----|-------|---------------|--------------|-------|-------|
| 1 | xai/grok/code-fast-1 | 885 | 464 | 1.9x | proper compression |
| 2 | xai/grok/code-fast-1 | 885 | 360 | 2.5x | proper compression |
| 3 | xai/grok/code-fast-1 | 885 | 405 | 2.2x | proper compression |

grok showed more consistency but earlier tests showed similar truncation patterns.

## reproduction

```bash
# compress a brief via bhrain/sitrep
npx tsx src/domain.roles/mechanic/skills/brief.compress/compress.via.bhrain.ts \
  --from src/domain.roles/mechanic/briefs/practices/code.prod/evolvable.procedures/rule.require.dependency-injection.md.pt1.md \
  --via anthropic/claude/sonnet \
  --into /tmp/out.md \
  --json

# run multiple times — some will truncate
```

## invocation pattern

```ts
const { output } = await contextBrain.brain.choice.ask({
  role: {},
  prompt: `
you are a brief compression specialist who uses sitrep methodology.

${sitrepMethodologyBrief}

---

compress the source brief below via the sitrep methodology above.

output ONLY the compressed brief — no preamble, no meta-commentary.

source brief:

${sourceContent}
`,
  schema: {
    output: z.string(),
  },
});
```

## expected behavior

given a 885-token brief:
- compressed output should be 200-500 tokens (target: 30-50% of original per sitrep methodology)
- output should be valid markdown
- output should preserve: rule statement, at least one good/bad example, enforcement level

## actual behavior (when truncated)

- output is 5-20 tokens
- often just the title or first line
- no code examples, no rule content

## questions for investigation

1. is this a stop token issue in the brain provider?
2. is the schema (`z.string()`) interpreted as "any string length is valid"?
3. is there a max_tokens default that's too low for this use case?
4. does the prompt structure cause early termination (the "output ONLY" instruction over-interpreted)?

## workaround rejected

the caller (compress.via.bhrain.ts) could add retry logic that checks token count and retries if output is suspiciously short (< 10% of original). this was implemented but rejected — the defect should be fixed at the brain level, not papered over with retries.

## files

- `src/domain.roles/mechanic/skills/brief.compress/compress.via.bhrain.ts` — the compressor
- `src/domain.roles/mechanic/skills/brief.compress/briefs/sitrep.methodology.md` — the methodology brief passed in prompt

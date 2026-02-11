# tactic: chain-of-thought via structured output schema

## problem

oneshot brain calls produce inconsistent outputs. the same prompt, same brain, same input — different results. sometimes truncated, sometimes verbose, sometimes malformed.

## solution

add "think first" fields to the output schema. force the brain to reason before it outputs.

## pattern

```ts
schema: {
  output: z.object({
    forethought: z
      .string()
      .describe('what is this about? what is the goal? who is the audience?'),
    rationale: z
      .string()
      .describe('what is critical and must be kept? what can be cut? why?'),
    result: z
      .string()
      .describe('the final output'),
  }),
}
```

use `output.result` as the actual output. discard or log forethought/rationale.

## why it works

1. **forces deliberation** — brain must articulate its grasp of the task before it acts
2. **surfaces assumptions** — forethought reveals what the brain thinks the task is
3. **documents decisions** — rationale explains what got kept/cut and why
4. **improves consistency** — structured thought reduces variance in outputs
5. **aids debug** — when output is wrong, forethought/rationale show where the logic failed

## field design

| field | purpose | example description |
|-------|---------|---------------------|
| forethought | grasp the task | "what is this about? what is the goal?" |
| rationale | plan the approach | "what is critical? what can be cut?" |
| result | execute the task | "the final output as raw markdown" |

order matters: forethought → rationale → result. the brain fills fields in order, so thought precedes output.

## observability

emit forethought and rationale to a .meta file for debug:

```ts
const meta = {
  forethought: output.forethought,
  rationale: output.rationale,
  // ... other provenance info
};
await fs.writeFile(`${outputPath}.meta`, JSON.stringify(meta, null, 2));
```

## when to use

- compression tasks (what to keep vs cut)
- classification tasks (why this category)
- generation tasks (what constraints to satisfy)
- any oneshot call where consistency matters

## when not to use

- simple extraction (no thought needed)
- high-volume low-stakes calls (extra tokens cost money)
- stream responses (structured output requires complete response)

## example: brief compression

before (inconsistent):
```ts
schema: { output: z.string() }
// sometimes truncated, sometimes verbose, sometimes json-escaped
```

after (consistent):
```ts
schema: {
  output: z.object({
    forethought: z.string().describe('what is this brief about? purpose? audience?'),
    rationale: z.string().describe('what is decision-critical? what can be cut?'),
    sitrep: z.string().describe('the compressed brief as raw markdown'),
  }),
}
// consistent structure, reasoned compression, debuggable
```

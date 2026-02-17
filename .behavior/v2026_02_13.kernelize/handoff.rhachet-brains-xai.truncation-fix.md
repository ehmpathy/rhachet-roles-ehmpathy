# handoff: rhachet-brains-xai truncation fix

## the problem

structured output calls to xai/grok return truncated JSON, which causes `JSON.parse()` failures.

### error symptoms

```
SyntaxError: Unexpected end of JSON input
SyntaxError: Unterminated string in JSON at position 8192
SyntaxError: Expected property name or '}' in JSON at position 12288
```

### failure rates

from perfeval run (2026-02-16):
- 624 total failures out of ~1200 compression attempts
- truncation positions cluster at buffer boundaries: 4096, 8192, 12288, 16384 bytes

### failure time distribution

two distinct failure modes:
1. **fast failures (3-28ms)** — likely cached/rejected responses
2. **slow failures (970-2400ms)** — real API calls with truncation

---

## root cause analysis

### what IS correct

the adapter correctly uses structured output (genBrainAtom.js:66-73):

```javascript
response_format: {
    type: 'json_schema',
    json_schema: {
        name: 'response',
        strict: true,
        schema: jsonSchema,
    },
},
```

### what is NOT correct

**absent `max_tokens` parameter** — if xAI's API hits a token limit (model default, account limit, or rate limit), the output is truncated mid-generation. this produces invalid JSON despite `strict: true`.

structured output with `strict: true` guarantees the model will **attempt** to produce valid JSON, but if the response is cut short (by token limits), the JSON is incomplete.

**no `finish_reason` check** — the adapter does not check `response.choices[0].finish_reason`. values:
- `stop` — normal completion
- `length` — hit token limit (output truncated)
- `content_filter` — filtered
- `null` — still in stream

**no error handler for truncated response** — line 78 just does `JSON.parse(content)` which throws on malformed JSON.

---

## recommended fixes

### fix 1: add `max_tokens` parameter (required)

```javascript
// genBrainAtom.js, line 63
const response = await openai.chat.completions.create({
    model: config.model,
    messages,
    max_tokens: config.maxTokens ?? 4096, // <-- ADD THIS
    response_format: {
        type: 'json_schema',
        json_schema: {
            name: 'response',
            strict: true,
            schema: jsonSchema,
        },
    },
});
```

add to each config in BrainAtom.config.js:
```javascript
'xai/grok/code-fast-1': {
    model: 'grok-code-fast-1',
    maxTokens: 16384, // <-- ADD THIS (generous for structured output)
    // ...
},
```

### fix 2: check `finish_reason` (required)

```javascript
// after line 76
const finishReason = response.choices[0]?.finish_reason;
if (finishReason === 'length') {
    throw new Error(
        `xai response truncated: output hit token limit. ` +
        `finish_reason=${finishReason}, content_length=${content.length}`
    );
}
```

### fix 3: graceful JSON parse with context (nice-to-have)

```javascript
// replace line 78
let parsed;
try {
    parsed = JSON.parse(content);
} catch (error) {
    throw new Error(
        `xai response invalid JSON: ${error.message}. ` +
        `finish_reason=${finishReason}, ` +
        `content_length=${content.length}, ` +
        `content_preview="${content.slice(0, 200)}..."`
    );
}
```

---

## test plan

after fix, verify:

1. **no truncation errors** — run compression perfeval, expect 0 JSON parse failures
2. **token limit handled** — mock a response with `finish_reason: 'length'`, expect descriptive error
3. **large outputs succeed** — compress a 10KB brief, expect valid structured output

---

## context

- **affected repo**: rhachet-brains-xai
- **affected file**: `src/domain.operations/atom/genBrainAtom.ts`
- **package version**: 0.2.1
- **discovered via**: brief.compress perfeval runs (rhachet-roles-ehmpathy)
- **perfeval report**: `.perfevals/2026-02-16.1.evals.md`

---

## priority

**high** — this causes 50%+ failure rate on compression operations. the skill is unusable for production briefs until fixed.

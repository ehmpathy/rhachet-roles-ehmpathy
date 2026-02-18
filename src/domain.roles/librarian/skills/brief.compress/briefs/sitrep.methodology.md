# sitrep: situation report compression

## definition

**sitrep** = situation report.

military communication format. one purpose: convey decision-critical information in minimal words.

three questions only:
1. **situation** — what is the state?
2. **significance** — why does it matter?
3. **action** — what must be done?

all else gets cut.

## your task

you receive a source brief. you output a compressed brief.

the compressed brief must:
- be 30-50% of the original token count
- preserve all decision-critical content
- be valid markdown
- contain NO preamble, NO meta-commentary — just the compressed brief itself

## what to preserve

1. **rule statements** — the exact rule or pattern (do not paraphrase into vagueness)
2. **one good/bad example pair** — one pair is enough; cut duplicates
3. **code blocks in full** — never truncate code; keep whole or cut entirely
4. **enforcement level** — BLOCKER or NITPICK must survive

## what to cut

1. **motivation prose** — "the reason we do this is..." becomes the rule itself
2. **duplicate examples** — second/third example pairs that show the same pattern
3. **filler phrases** — "it's important to note that...", "as mentioned above..."
4. **journey content** — how the author arrived at the rule; reader needs destination only

## example

### before (source brief)

```markdown
# rule.prefer.const

## what
always use const over let when the variable is never reassigned.

## why
const communicates intent — the reader knows immediately that this value won't change. it prevents accidental reassignment bugs. it's a small detail, but small details compound into readable code.

## examples

bad:
` ` `ts
let name = 'alice';
console.log(name);
` ` `

good:
` ` `ts
const name = 'alice';
console.log(name);
` ` `

bad:
` ` `ts
let count = 5;
return count;
` ` `

good:
` ` `ts
const count = 5;
return count;
` ` `

## enforcement
NITPICK
```

### after (sitrep compressed)

```markdown
# rule.prefer.const

use const over let when the variable is never reassigned. communicates intent, prevents accidental reassignment.

bad:
` ` `ts
let name = 'alice';
console.log(name);
` ` `

good:
` ` `ts
const name = 'alice';
console.log(name);
` ` `

enforcement: NITPICK
```

### why this works

- rule preserved exactly
- one example pair kept (second pair cut — same pattern)
- code blocks complete
- enforcement level present
- ~40% of original

## failure modes

**too aggressive** (bad):
```markdown
# rule.prefer.const
use const instead of let.
enforcement: NITPICK
```
problem: no examples, vague rule ("instead of let" vs "when never reassigned")

**not aggressive enough** (bad): kept all duplicate examples, kept verbose why section

## output format

output the compressed brief directly. no wrapper. no explanation. just the markdown.

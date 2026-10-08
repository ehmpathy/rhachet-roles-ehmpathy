# rule.require.treestruct-output

## .what

cli skill output must use turtle vibes treestruct format for consistent, scannable output.

## .why

- consistent visual language across all skills
- easy to scan hierarchical data
- turtle vibes add joy to the terminal
- sub.buckets group related content cleanly

## .pattern

### structure

```
🐢 {vibe phrase}

🐚 {skill-name} [--mode {mode}]
   ├─ {key}: {value}
   ├─ {key}: {value}
   └─ {section}
      ├─ {item}
      │  ├─
      │  │
      │  │  {content line 1}
      │  │  {content line 2}
      │  │
      │  └─
      └─ {item}
         ├─
         │
         │  {content}
         │
         └─
```

### two shape rules

- **a header owns its trunk** — the first branch sits on the line right below the header. a blank
  line separates two trees (the 🐢 vibe line from the 🐚 root above), never a header from its own
  branches → `rule.forbid.treestruct-header-gap`
- **peers share one depth; a label owns its items** — lines side by side in sense sit side by side
  in the tree; only a list nests, as child branches under its label. depth steps the glyph right,
  never the words → `rule.forbid.treestruct-indented-text-as-children`

```
✋ ConstraintError: this command is not paved
   ├─ blocked: grep -rln 'reef' src/
   └─ paved alternatives for `grep`
      ├─ rhx grepsafe --pattern '<regex>' --path <dir>
      └─ rhx git.repo.get lines --in <org/repo> --words '<text>'
```

### elements

| element | purpose |
|---------|---------|
| `🐢` | turtle header - sets the vibe |
| `🐚` | shell root - names the command |
| `├─` | sub.branch - has peers below |
| `└─` | sub.branch (last) - final peer |
| `│` | continuation - connects to parent |
| `├─`...`└─` | sub.bucket - groups multiline content |

### vibe phrases

| context | phrase |
|---------|--------|
| plan/preview | `heres the wave...` |
| success | `cowabunga!` or `righteous!` |
| blocked | `bummer dude...` |
| nudge | `hold up, dude...` |

### sub.bucket

use sub.bucket for multiline content. opened with `├─`, closed with `└─`.

**whitespace is required**: blank `│` line below open and above close for visual space.

```
├─ filename.ts (3)
│  ├─
│  │
│  │  - old line
│  │  + new line
│  │
│  └─
```

nested sub.buckets for sections:

```
└─ preview
   ├─ file1.ts (2)
   │  ├─
   │  │
   │  │  - old
   │  │  + new
   │  │
   │  └─
   └─ file2.ts (1)
      ├─
      │
      │  - old
      │  + new
      │
      └─
```

## .examples

### success output

```
🐢 cowabunga!

🐚 sedreplace --mode apply
   ├─ old: getUserById
   ├─ new: findUserByUuid
   ├─ glob: src/**/*.ts
   ├─ files: 12
   ├─ matches: 34
   └─ updated
      ├─ src/domain/getUser.ts (3)
      │  ├─
      │  │
      │  │  - export const getUserById = async (
      │  │  + export const findUserByUuid = async (
      │  │
      │  └─
      └─ ... (11 more files)
```

### blocked output

```
🐢 bummer dude...

🐚 sedreplace
   └─ ✋ blocked: unbound glob

glob patterns that start with **/ are too broad.

use a bounded glob instead:
  --glob 'src/**/*.ts'
```

## .see also

- git.commit/output.sh - reference implementation
- `rule.forbid.treestruct-header-gap` — no blank line between a header and its trunk
- `rule.forbid.treestruct-indented-text-as-children` — a list nests under its label

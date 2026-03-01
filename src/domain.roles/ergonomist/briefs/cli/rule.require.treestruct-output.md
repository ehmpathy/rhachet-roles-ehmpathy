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
      │  │  {content line 1}
      │  │  {content line 2}
      │  └─
      └─ {item}
         ├─
         │  {content}
         └─
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

use sub.bucket for multiline content. opened with `├─`, closed with `└─`:

```
├─ filename.ts (3)
│  ├─
│  │  - old line
│  │  + new line
│  └─
```

nested sub.buckets for sections:

```
└─ preview
   ├─ file1.ts (2)
   │  ├─
   │  │  - old
   │  │  + new
   │  └─
   └─ file2.ts (1)
      ├─
      │  - old
      │  + new
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
      │  │  - export const getUserById = async (
      │  │  + export const findUserByUuid = async (
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

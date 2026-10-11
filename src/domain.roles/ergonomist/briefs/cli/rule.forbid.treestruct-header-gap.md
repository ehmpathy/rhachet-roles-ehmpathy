# rule.forbid.treestruct-header-gap

## .what

no blank line between a treestruct header and its trunk. the header line owns the tree; the
first branch sits on the very next line.

a blank line ends a tree. it belongs **between** two trees (a 🐢 vibe line and a 🐚 root, a block
and its 🥥 hint), never **inside** one.

## .why

- **a gap reads as an end** — the eye takes the blank line as "this block is done", then meets
  orphan branches that hang from no visible root
- **the header is the root** — `├─` and `└─` draw from the line above; a gap cuts the line they
  draw from
- **one rule, no judgment** — "blank line = between trees" is a test any author can apply at a
  glance; "blank line where it looks nice" is not

## .the test

does a `├─` or `└─` sit right below a blank line? then a header lost its trunk — close the gap.

## .examples

### 👎 bad — the header floats above its trunk

```
✋ ConstraintError: this command is not paved

   ├─ blocked: grep -rln 'reef' src/
   └─ paved alternatives for `grep`
      └─ rhx grepsafe --pattern '<regex>' --path <dir>
```

### 👍 good — the header owns its trunk

```
✋ ConstraintError: this command is not paved
   ├─ blocked: grep -rln 'reef' src/
   └─ paved alternatives for `grep`
      └─ rhx grepsafe --pattern '<regex>' --path <dir>
```

### 👍 good — a blank line between two trees

```
🐢 bummer dude...

🐚 sedreplace
   └─ ✋ blocked: unbound glob
```

the 🐢 vibe line is its own block; the 🐚 root starts the tree. the gap separates two blocks,
not a header from its trunk.

## .enforcement

- a blank line between a treestruct header and its first branch = **blocker**
- a blank line inside a tree, between branches of one trunk = **blocker** (use a `│` spacer line)

## .see also

- `rule.require.treestruct-output` — the treestruct shape
- `rule.forbid.treestruct-indented-text-as-children` — the nest rule for lists

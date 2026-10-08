# rule.forbid.treestruct-indented-text-as-children

## .what

depth in a treestruct means ownership, and only ownership:

- **peers share one depth** — lines that sit side by side in sense (a blocked part, the paved
  alternatives for it, the nearest patterns) sit side by side in the tree, at the same depth
- **a label owns its items** — a list nests under its label as child branches, one level down
- **text never steps right on its own** — depth shows in the branch glyphs (`├─` / `└─`); extra
  spaces before the words claim a depth the glyphs deny

## .why

- **indented words are not a hierarchy** — `├─   item` is a peer of `├─ label`, at the same depth;
  the extra spaces claim a child the glyphs deny
- **a nested peer reads as a child** — put the alternatives under the `blocked:` line and the reader
  takes them as a detail of the block, not as the answer beside it
- **the reader scans glyphs, not whitespace** — the branch column is where the eye finds structure

## .the test

1. does a line read `├─   text` or `└─   text` (spaces between the glyph and the words)? the words
   were indented in place of a branch — step the glyph right, under the label
2. does a line nest under another it does not belong to? lift it to its peer's depth

## .examples

### 👎 bad — items indented as text, peers of their label

```
   ├─ blocked: grep -rln 'reef' src/
   │  ├─ paved alternatives for `grep`:
   │  ├─   rhx grepsafe --pattern '<regex>' --path <dir>
   │  └─   rhx git.repo.get lines --in <org/repo> --words '<text>'
```

### 👎 bad — a peer nested as a child

```
   ├─ blocked: grep -rln 'reef' src/
   │  └─ paved alternatives for `grep`
   │     ├─ rhx grepsafe --pattern '<regex>' --path <dir>
   │     └─ rhx git.repo.get lines --in <org/repo> --words '<text>'
```

the alternatives answer the block; they are not a detail of it.

### 👍 good — peers at one depth, items under their label

```
✋ ConstraintError: this command is not paved (2 parts)
   ├─ blocked: ls
   ├─ paved alternatives for `ls`
   │  ├─ tree -L 1 <dir>
   │  └─ rhx globsafe --pattern '<glob>'
   │
   ├─ blocked: grep -rln 'reef' src/
   ├─ paved alternatives for `grep`
   │  ├─ rhx grepsafe --pattern '<regex>' --path <dir>
   │  └─ rhx git.repo.get lines --in <org/repo> --words '<text>'
   │
   └─ tip: a compound runs only if every part is paved; the other parts are paved alone, so split the call
```

a `│` spacer line sets one section of peers apart from the next. a label ends with no colon: the
branches below it already say "these belong to me".

## .enforcement

- list items drawn as indented text beside their label, in place of child branches = **blocker**
- a peer nested under a line it does not belong to = **blocker**
- a label that ends in a colon over child branches = **nitpick**

## .see also

- `rule.require.treestruct-output` — the treestruct shape
- `rule.forbid.treestruct-header-gap` — the header owns its trunk

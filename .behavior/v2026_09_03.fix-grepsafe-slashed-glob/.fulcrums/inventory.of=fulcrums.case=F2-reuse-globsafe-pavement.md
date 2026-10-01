# F2 · the fallback should reuse globsafe's expansion pavement

- **rework**: clean
- **status**: 🌙 moot — F9 deleted the fallback arm this question applied to
- **confidence**: 80% → moot

## .the fork

the `grep` fallback needed to turn a slashed glob into a file list.

| option | shape |
|--------|-------|
| **A (taken)** | reuse `globsafe.sh`'s pattern — `shopt -s globstar nullglob`, expand, collect — anchored at cwd to match `rg` |
| B | transcribe issue #620's snippet (`globstar nullglob dotglob`) |

## .taken, and why

**A.**

1. B sets `dotglob`, which pulls `.git/` into any `**/*` expansion. globsafe handles the wish's
   `.agent/**/*.md` repro without it, since `.agent` is spelled literally.
2. B is a second expander for a solved problem; two in one directory drift silently.
3. globsafe has one engine in practice: its header claims an `fd` path, but no `fd` call exists in
   `claude.tools/`. reuse inherits no engine divergence.

globsafe anchors at `--path`; `rg` anchors at cwd. a literal lift would open a new divergence, so A
reused the shape and anchored at cwd.

## .confidence — 80%

the 20%: a shared sourced helper vs a followed pattern. `rule.prefer.wet-over-dry` favors the pattern
at n=2.

## .verdict

🌙 **moot.** F9 ruled failfast when `rg` is absent and deleted the `grep` arm. no branch remains.

# self-review: has-clear-instructions (r1)

## review scope

double-check: are the instructions followable?
- can the foreman follow without prior context?
- are commands copy-pasteable?
- are expected outcomes explicit?

---

## why it holds

### instructions are followable

reviewed each step in the playtest:

| step | followable? | prior context needed? |
|------|-------------|----------------------|
| prerequisites | yes | lists exact needs |
| step 1 setup | yes | creates fresh repo |
| step 1 action | yes | single command |
| step 2 action | yes | single command |
| step 3 action | yes | single command |
| step 4 | yes | creates fresh repo |
| step 5 | yes | creates fresh repo |
| step 6 | yes | continues from 5 |
| cleanup | yes | removes temp dirs |

**no step requires prior context.** each step either starts fresh or continues from the previous step in sequence.

---

### commands are copy-pasteable

checked each command block:

| command | copy-pasteable? |
|---------|-----------------|
| `cd .temp` | yes |
| `mkdir playtest-rebase && cd playtest-rebase` | yes |
| `git init` | yes |
| `echo '{"name": "test"...` | yes |
| `pnpm install` | yes |
| `git add -A && git commit -m "..."` | yes |
| `git checkout -b feature` | yes |
| `git rebase main` | yes |
| `rhx git.branch.rebase take --whos theirs pnpm-lock.yaml` | yes |
| `rhx git.branch.rebase lock refresh` | yes |
| `rhx git.branch.rebase continue` | yes |

**all commands are copy-pasteable.** no commands require manual edit or substitution.

---

### expected outcomes are explicit

reviewed each expected outcome:

| step | expected outcome | explicit? |
|------|------------------|-----------|
| 1 | shows `🐢 righteous!` | yes — exact text |
| 1 | shows suggestion with ⚡ | yes — exact format |
| 2 | shows `🐢 shell yeah!` | yes — exact text |
| 2 | shows `detected: pnpm` | yes — exact text |
| 2 | lock is staged | yes — how to verify |
| 3 | rebase completes | yes — how to verify |
| 4 | shows `hold up dude...` | yes — exact text |
| 4 | shows `no rebase in progress` | yes — exact text |
| 5 | shows `no lock file found` | yes — exact text |
| 6 | no suggestion | yes — what to look for |

**every outcome specifies what to look for.** no vague "it works" criteria.

---

## conclusion

| check | result |
|-------|--------|
| followable without context | ✓ yes |
| commands copy-pasteable | ✓ yes |
| outcomes explicit | ✓ yes |

the playtest instructions are clear and followable.

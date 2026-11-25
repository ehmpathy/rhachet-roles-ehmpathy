# rule.forbid.unpaved-commands-in-hints

## .what

a skill's 🥥 hint, refusal remedy, or `--help` example names only paved commands: an `rhx` skill,
or a command `rhx permissions.get` lists as pre-approved. never an adhoc `git fetch`, `git pull`,
`cat`, `rm`, `ls`, or `sed`.

## .why

- a clone acts on the hint it reads. an unpaved command in a hint either blocks on the
  permission hook (a dead end) or teaches the clone to reach for the shell the guards forbid
- the skill already owns the act: a retry refetches, a meter verb rewrites its own file. the
  paved command is nearly always there; the hint just has to name it
- a hint is the most-read line of a refusal. a bad one is copied into every next attempt

## .how

1. name the skill that does the act: `rhx git.branch.rebase begin` (it fetches), not `git fetch`
2. a meter file is repaired by its meter verb: `rhx git.commit.uses block --global`, not `rm`
3. no paved command exists? name the sponsor's act in words ("ask your sponsor to pull them into
   this tree"), then the paved retry. and catch a dream for the absent skill
4. the one carve-out: a refusal for a state no paved verb can repair (a directory at a meter
   path) may name the shell command, in that refusal alone, addressed to a sponsor

## .examples

### 👎 bad

```
🥥 did you know?
   ├─ a fast-forward onto main would orphan them; pull them in first
   └─ git pull --ff-only origin feature/test-branch
```

### 👍 good

```
🥥 did you know?
   ├─ a fast-forward onto main would orphan them; ask your sponsor to pull them into this tree, then retry
   └─ rhx git.branch.rebase begin --mode apply
```

## .enforcement

- an unpaved command in a skill hint, remedy, or help example where a paved one exists = **blocker**
- an unpaved command where none exists, with no sponsor ask and no dream = **nitpick**

## .see also

- `rule.require.coconut-hints` — the 🥥 shape these hints ride
- `define.why-permission-guards-allowlist-all-rhx.[article].md` — why `rhx` is the paved road

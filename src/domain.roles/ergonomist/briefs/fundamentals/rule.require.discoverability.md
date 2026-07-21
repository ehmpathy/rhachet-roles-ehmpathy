# rule.require.discoverability

## .what

every action a human needs must be **discoverable** from the surface itself — prompted,
listed, or shown — never held only in the human's memory or an unlinked manual. show the
options; do not force the human to recall them.

grounds the *intuitive* quality of `def.ergonomic` and the *no undiscoverable step* line
of `def.frictionless`. from norman's **discoverability** and nielsen's **recognition
rather than recall** (`ref.ergonomics.fundamentals`).

## .why

- a step a human cannot find is a step a human cannot take
- recall is expensive and error-prone; recognition is cheap — the surface should carry the
  knowledge, not the human's memory
- an undiscoverable action forces a detour into source or docs, which breaks flow

## .the test

"could a first-time human find the next move without a question or a source read?"

- yes → discoverable
- no → the surface must surface it

## .how

- **list the options** — `--help`, a usage line, an error that names the valid choices
- **prompt the required next step** — when a step is mandatory, the surface says so
- **reveal the affordance** — the label tells what the control does (a signifier)
- **link the deeper docs** — where detail is unavoidable, point to it inline

## .examples

### 👎 bad — the next step is a secret

```bash
# a surfer runs the lesson booker; it stalls with no hint
$ booklesson --surfer kai
Error: config absent

# which config? where? what key? the surfer must guess or grep source
```

### 👍 good — the surface reveals the move

```bash
$ booklesson --surfer kai
🐢 hold up, dude — no surf spot set

  pick a spot with --spot, e.g.:
    booklesson --surfer kai --spot pipeline

  see all spots:
    booklesson spots --list
```

### 👍 good — options shown, not recalled

```bash
$ booklesson --board
🐢 which board? one of:
  ├─ foamboard   (beginner)
  ├─ longboard   (cruiser)
  └─ shortboard  (advanced)
```

## .enforcement

- a required step reachable only from memory or source (not prompted/listed/linked) = **blocker**
- an error that rejects input without a note of the valid options = **blocker**

## .see also

- `ref.ergonomics.fundamentals` — discoverability (norman), recognition over recall (nielsen 6)
- `rule.require.errors-name-the-fix` — the recovery counterpart
- `def.ergonomic` — the *intuitive* quality this backs
- `def.frictionless` — the *no undiscoverable step* line this backs

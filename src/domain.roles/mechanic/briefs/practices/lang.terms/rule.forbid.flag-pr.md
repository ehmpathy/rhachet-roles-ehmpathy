# rule.forbid.flag-pr

## .what

no skill takes a `--pr` flag. a `git.pull.*` skill names its pull request by `--which <n>`; a skill whose id is no pull number takes `--exid <id>`.

## .why

- `pr` is an abbreviation; the skill family already says `pull` in its name
- `--pull` would say it twice: `git.pull.watch set --pull 1220` repeats the noun the skill name holds. `--which` asks the one question left: which pull?
- one flag across the family: comment, title, description, and watch all read `--which <n>`

## .examples

### 👍 good

```sh
rhx git.pull.watch set --which 1220 --mode apply
rhx git.pull.comment get --which 1220
rhx git.pull.title set --which 1220 --from ./title.md --mode apply
```

### 👎 bad

```sh
rhx git.pull.watch set --pr 1220 --mode apply
rhx git.pull.watch set --pull 1220 --mode apply
```

## .scope

every flag a skill parses, its `--help`, its hints, and its error text

## .enforcement

- a skill or flag that takes `--pr` = blocker
- a `git.pull.*` flag that repeats `pull` (`--pull`, `--pull-number`) = nitpick
- a hint or `--help` line that tells a caller to type a flag the skill does not take = blocker

# rule.forbid.flag-pr

## .what

no skill takes a `--pr` flag. name a pull request by `--pull <n>`, or by `--exid <id>` where the id is not a pull number.

## .why

- `pr` is an abbreviation; `pull` is the word the `git.pull.*` skill family already holds
- one noun per concept: the skill is `git.pull.watch`, so its flag is `--pull`, never a second name for the same concept
- `--exid` names any external id with one flag, so a skill that takes an issue, a run, or a pull keeps one shape

## .examples

### 👍 good

```sh
rhx git.pull.watch set --pull 1220 --mode apply
rhx git.pull.watch del --pull 1220 --mode apply
```

### 👎 bad

```sh
rhx git.pull.watch set --pr 1220 --mode apply
```

## .scope

- every flag a skill parses, its `--help`, its hints, and its error text
- extant `--pr` flags (`git.pull.comment`, `git.pull.title`, `git.pull.description`, `git.pull`) move to `--pull`

## .enforcement

- a new skill or flag that takes `--pr` = blocker
- a hint or `--help` line that tells a caller to type `--pr` on a skill that takes `--pull` = blocker

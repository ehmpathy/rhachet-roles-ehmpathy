# F10: `--quota <n>` stays a bare placeholder

## .the fork
the director grant line prints `--quota <n>`. on the push and stage refusals the skill knows the uses
left on the meter, so it could print them as a hint (`--quota <n, now 3 left>`) or prefill them.

| option | what the director sees | cost |
|---|---|---|
| A, bare `<n>` | `--quota <n>` | the director sizes the grant from the work, unprompted |
| B, uses-left hint | `--quota <n>` plus "3 uses left" | a number that describes the past invites a copy; on uses-out it would read `0` |
| C, prefill | `--quota 3` | the line runs as-is and may set a quota the director never chose |

## .taken, why
A. the vision answered it (open question 4): the skill cannot know how much work is left, and the
director sizes and justifies the grant. `--why` is required by the verb for the same reason.

## .rework
clean: one format string in `get_one_director_grant_command`.

## .confidence
85%: the miss is cheap and loud (a too-small grant meets the next refusal), and the reviewer graded
it a nitpick.

## .where
`git.commit.director.operations.sh`, `get_one_director_grant_command`; raised in 5.1 review i006
(enroll-impl-behavior-intent, item 6).

## .verdict
none yet; best-guess A.

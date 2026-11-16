# F43 — an enum refusal joins its choices with ` | `

## .the fork

`check_watch_enum_arg` in `git.pull.watch.operations.sh` named the choices space-joined:
`--mode must be one of: plan apply; got 'yolo'`. 5.3 i003 peer lane r11 nitpick.6 noted that
`plan apply` reads as one two-word value, while the usage line and the help write `plan|apply`.

- (a) keep the space join
- (b) join with ` | `: `--mode must be one of: plan | apply; got 'yolo'`

## .taken, why

(b). each choice reads as one value, in the shape the usage line and the help already use
(`rule.forbid.ambiguous-labels`). the refusal still names every valid value and the value it got,
so no assert lost its intent: the delivery and lifecycle asserts moved from `plan apply` to
`plan | apply`, the same check on the new text.

## .rework

clean: one `printf` join in `check_watch_enum_arg`; the asserts and snaps follow.

## .confidence

90%: a separator is a reader's call; the bar matches the help the caller reads first.

## .where

`git.pull.watch.operations.sh` `check_watch_enum_arg`; delivery case16 [t2], lifecycle refusal
asserts; blackbox acceptance [t1].

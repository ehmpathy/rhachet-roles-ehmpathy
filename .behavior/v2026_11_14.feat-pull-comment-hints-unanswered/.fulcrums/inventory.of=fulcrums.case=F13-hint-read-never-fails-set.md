# F13 — a failed hint read never fails the set

## .the fork
the hint read can fail: rate limit, auth refusal, 5xx, or an internal fault. options: (a) every failure prints one warn line, with its class, and the set exits 0; (b) allowlist the transient ones and exit non-zero on the rest.

## .taken, why
(a). the wish states it outright: the hint is a read, it never fails the set, and a failed read prints one warn line while the set exits 0. the write already landed and was read back and hash-checked; a non-zero exit would tell a caller the write failed, and a retry would then post twice under a fresh key. the failure is not hidden: the warn names the class (`ConstraintError` or `MalfunctionError`), the message, and the retry command, on stdout and stderr both. an internal fault with no refusal still surfaces as `MalfunctionError: <first stderr line>`.

## .rework, why
clean: one branch in `emit_unanswered_hint`.

## .confidence, why low
85%. the wish settles it; a reviewer read failhide as stricter than the wish.

## .where
`git.pull.comment.set.sh` emit_unanswered_hint

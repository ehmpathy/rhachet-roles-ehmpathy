# F1 — composer forwards `--auth` only when the caller passed it

## .the fork
`git.commit.set` always runs `git.commit.push.sh --auth "$AUTH"`, so push.sh reads every composed run as explicit and the fallback could never fire through set. options: (a) set forwards `--auth` only when its caller passed one; (b) a hidden env var marks the default; (c) a third enum value such as `--auth auto`.

## .taken, why
(a). no new public flag, no hidden channel. push.sh keeps one rule: no `--auth` = default = fallback allowed.

## .rework, why
clean. one call-site change in set.sh plus a flag in each parser.

## .confidence, why low
90%. (c) gives an explicit name for the mode, which a wisher may prefer.

## .verdict
confirmed by the director at 1.vision approval (seed S1).

## .where
`git.commit.set.sh:1141,1153,1264`; `git.commit.push.sh` arg parse.

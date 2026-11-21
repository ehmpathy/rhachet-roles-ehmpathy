# F6 — "robot" stays the current login with a 🐢 body

## .the fork
extant `is_robot` = the current credential's login, with a body that opens 🐢. under `--auth as-human`, a reply the bot posted earlier counts as an answer only if the bot is the pr author. options: (a) keep the extant definition; (b) any 🐢-opened comment, whatever the author.

## .taken, why
(a). it is the extant, tested definition. (b) lets anyone who types 🐢 close a thread. on this fleet the bot opens the pr, so the bot is usually the pr author and counts either way.

## .rework, why
clean: one jq def.

## .confidence, why low
70%. the release gate (#1171) will want an auth-independent rule; this may need to change there.

## .where
the shared operation (F1)

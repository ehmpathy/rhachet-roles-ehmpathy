# F17 · the daemon reads the spawner's login-session keyrack (QB5)

- fork: (a) accept — the paused alert names the unlock, and any clone in that session can run it · (b) key the daemon by login session too — one per machine per version per session
- taken: (a). (b) breaks "one per machine per version", a WHAT the wish fixes. on a box with one human login, the two match
- rework: clean — (b) would add the session id to the key string only
- risk: **risky — it touches a credential**: the daemon reads the session's unlocked ehmpath token (F11), never the human login
- confidence: 85% — a box with clones across several ssh sessions would see paused alerts the other sessions cannot clear
- where: `git.pull.watch.daemon.sh` token read; `git.pull.watch.operations.sh` key
- verdict: best-guessed at the lean (commander, S2: hows land at their leans)

# F2 · a 404 ends the watch at its first read, not after confirm reads

- fork: (a) end at the first 404 · (b) end once the 404 holds across 3 reads
- taken: (a). github answers 404 both for a gone pr and for a pr this token cannot see. the token is held for the daemon life, so a token that cannot see a pr answers 404 on every read: (b) only delays the same end. no read shows that github answers a transient 404 for a pr that exists. (b) would also add a count on disk and two seams: a respawn mid-count, and a steal that leaves the count behind under the old key. a false end costs one rewatch, which the note names
- rework: clean. a count can be added in the 404 branch later, should a transient 404 ever be seen
- confidence: 85%
- where: the tick's rc branch in `run_watch_tick`; `get_watch_github_resource` gets its own rc for a 404
- verdict: open. the self review on has-questioned-requirements moved this from (b) to (a)

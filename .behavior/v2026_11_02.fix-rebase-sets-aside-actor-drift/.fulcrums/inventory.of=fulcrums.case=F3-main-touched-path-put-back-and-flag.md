# F3 — main changed a set-aside path

## .the fork
- (a) put back the set-aside bytes as-is; flag the path in output
- (b) refuse the put-back for that path; leave main's version; keep the copy in the store
- (c) 3-way merge the edit onto main's version

## .taken
(a). the wish demands byte for byte. the flag keeps the clone from a silent revert of main's change in a later `--unstaged include` commit. for the ambient files, regeneration makes either version harmless.

## .rework
clean: one branch in the put-back operation.

## .confidence
65%. (b) is safer for a general file, and general files are in play: a clone tree may hold an unstaged `package.json` that main also bumps each release. (a) keeps the wish's byte-for-byte promise; the flag must name the path loud enough that a later `--unstaged include` commit is a deliberate act.

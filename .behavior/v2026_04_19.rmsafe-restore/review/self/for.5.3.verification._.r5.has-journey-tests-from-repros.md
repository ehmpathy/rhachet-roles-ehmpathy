# self-review: has-journey-tests-from-repros (r5)

## deeper review: wish as journey spec

re-read `0.wish.md` line by line. no repros artifact exists.
the wish itself defines the journeys.

### wish line 3-5: "cp into trash dir"

> when someone calls rmsafe
> we should first cp into `@gitroot/.agent/.cache/.../trash/` dir

test coverage:
- [t0] `expect(fs.existsSync(...TRASH_REL, 'src/target.txt')).toBe(true)`
- [t0] `expect(fs.readFileSync(...)).toBe('content to trash')`

why it holds: test verifies file content matches after copy to trash path.

### wish line 7: "trash dir should be gitignored"

> that .trash/ dir should be gitignored

test coverage:
- [t0] `expect(fs.existsSync(gitignorePath)).toBe(true)`
- [t0] `expect(fs.readFileSync(...)).toBe('*\n!.gitignore\n')`

why it holds: test verifies .gitignore extant and contains correct pattern.

### wish line 9: "findserted on mkdir"

> findserted on mkdir of that trash dir (.gitignore file lives within the dir)

test coverage:
- [t0] implicit - first delete creates dir and gitignore
- [t2] double delete reuses extant dir (idempotent)

why it holds: if findsert failed, second delete would error or create duplicate.

### wish line 11-13: "express how one can restore"

> the rmsafe command should at the end express how one can restore rm'd content
> (i.e., cpsafe out of the trash cache)

test coverage:
- [t0] `expect(result.stdout).toContain('🥥 did you know?')`
- [t0] `expect(result.stdout).toContain('you can restore from trash')`
- [t0] `expect(result.stdout).toContain('rhx cpsafe')`

why it holds: test verifies coconut hint with restore command in output.

### edge journeys beyond wish

| edge | why tested | test |
|------|------------|------|
| directory | user may rm -r dirs | [t1] |
| symlinks | must preserve as symlink | [t3] |
| zero matches | no hint when crickets | [t4] |

## conclusion

all wish phrases have test coverage.
journeys traced directly from wish to tests.

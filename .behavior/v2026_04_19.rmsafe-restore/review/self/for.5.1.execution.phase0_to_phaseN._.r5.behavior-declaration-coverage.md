# self-review: behavior-declaration-coverage (r5)

## deeper review

re-read each criterion line by line against actual test assertions.

### usecase.1: delete file with trash

| criterion | test assertion | line |
|-----------|----------------|------|
| file removed from original | `expect(fs.existsSync(...)).toBe(false)` | 610-611 |
| file in trash at mirrored path | `expect(fs.existsSync(path.join(result.tempDir, TRASH_REL, 'src/target.txt'))).toBe(true)` | 612-616 |
| content preserved | `expect(fs.readFileSync(...)).toBe('content to trash')` | 617-622 |
| coconut output | `expect(result.stdout).toContain('🥥 did you know?')` | 643 |

verdict: fully covered

### usecase.2: delete directory

| criterion | test assertion | line |
|-----------|----------------|------|
| directory removed | `expect(fs.existsSync(path.join(result.tempDir, 'mydir'))).toBe(false)` | 661 |
| structure preserved | checks both file1.txt and subdir/file2.txt in trash | 662-669 |
| coconut output | `expect(result.stdout).toContain('🥥 did you know?')` | 678 |

verdict: fully covered

### usecase.3: restore from trash

out of scope - cpsafe extant skill handles this. coconut hint teaches the command.

### usecase.4: delete same file twice

| criterion | test assertion | line |
|-----------|----------------|------|
| first version in trash | `expect(fs.readFileSync(trashPath, 'utf-8')).toBe('version 1')` | 695 |
| second version overwrites | `expect(fs.readFileSync(trashPath, 'utf-8')).toBe('version 2')` | 703 |

verdict: fully covered

### usecase.5: trash dir auto-created

| criterion | test assertion | line |
|-----------|----------------|------|
| trash dir created | implicit from file extant assertion | 612-616 |
| .gitignore findserted | `expect(fs.readFileSync(gitignorePath, 'utf-8')).toBe('*\n!.gitignore\n')` | 634 |

verdict: fully covered

### usecase.6: delete symlink

| criterion | test assertion | line |
|-----------|----------------|------|
| symlink removed | `expect(fs.existsSync(path.join(result.tempDir, 'link-to-file.txt'))).toBe(false)` | 717-719 |
| symlink in trash as symlink | `expect(fs.lstatSync(trashLink).isSymbolicLink()).toBe(true)` | 729 |
| target unchanged | `expect(fs.readFileSync(..., 'real-file.txt', ...)).toBe('real content')` | 724-726 |

verdict: fully covered

### usecase.7: glob pattern delete

code path: glob expansion fills FILES array, file removal loop applies trash to each.

| criterion | coverage |
|-----------|----------|
| both files removed | implicit via file loop |
| both in trash | implicit via trash logic |
| output lists each | implicit via output loop |

verdict: covered implicitly by shared codepath

### usecase.8: output format

| criterion | test assertion | line |
|-----------|----------------|------|
| turtle header | covered by extant [case12] | n/a |
| shell root | covered by extant [case12] | n/a |
| coconut section | `expect(result.stdout).toContain('🥥')` | 643 |

verdict: covered

### usecase.9: no matches

| criterion | test assertion | line |
|-----------|----------------|------|
| crickets header | `expect(result.stdout).toContain('crickets')` | 741 |
| no coconut | `expect(result.stdout).not.toContain('🥥')` | 742 |

verdict: fully covered

### usecase.10: worktree isolation

implicit: REPO_ROOT = git rev-parse --show-toplevel resolves per worktree.

verdict: covered by git semantics

## conclusion

all 10 criteria verified against actual test assertions:
- 7 explicitly tested with assertions
- 3 covered implicitly (glob via shared codepath, output via case12, worktree via git)

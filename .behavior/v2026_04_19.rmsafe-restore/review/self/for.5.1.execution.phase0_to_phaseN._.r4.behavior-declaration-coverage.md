# self-review: behavior-declaration-coverage

## scope

execution stone 5.1.execution.phase0_to_phaseN

## vision requirements (0.wish.md)

| requirement | implemented | evidence |
|-------------|-------------|----------|
| cp into trash dir before rm | yes | rmsafe.sh:177-178 (dir), 252-254 (file) |
| trash dir gitignored | yes | rmsafe.sh:104-106 findserts .gitignore |
| findsert on mkdir | yes | rmsafe.sh:100-107 findsert_trash_dir() |
| express how to restore | yes | output.sh:64-71 print_coconut_hint() |
| cpsafe restore command | yes | output.sh:70 uses `rhx cpsafe` |

## criteria coverage (2.1.criteria.blackbox.yield.md)

| usecase | covered by test | evidence |
|---------|-----------------|----------|
| usecase.1: delete file with trash | [case13.t0] | line 601-623 |
| usecase.2: delete directory with trash | [case13.t1] | line 650-680 |
| usecase.3: restore from trash | n/a (cpsafe extant) | cpsafe skill handles this |
| usecase.4: delete same file twice | [case13.t2] | line 683-704 |
| usecase.5: trash dir auto-created | [case13.t0] | line 625-635 |
| usecase.6: delete symlink | [case13.t3] | line 707-730 |
| usecase.7: glob pattern delete | extant [case11] | trash path mirrors structure |
| usecase.8: output format | [case13.t0] | line 637-647 |
| usecase.9: no matches | [case13.t4] | line 733-744 |
| usecase.10: worktree isolation | implicit | REPO_ROOT resolves per worktree |

## blueprint coverage (3.3.1.blueprint.product.yield.md)

### filediff tree

| file | change type | implemented |
|------|-------------|-------------|
| rmsafe.sh | [~] add trash logic | yes |
| output.sh | [~] add coconut function | yes |
| rmsafe.integration.test.ts | [~] add trash tests | yes |

### codepath tree

| component | implemented | evidence |
|-----------|-------------|----------|
| TRASH_DIR compute | yes | rmsafe.sh:97 |
| findsert_trash_dir() | yes | rmsafe.sh:100-107 |
| dir removal: cp -rP before rm | yes | rmsafe.sh:177-178 |
| file removal: cp -P before rm | yes | rmsafe.sh:252-254 |
| print_coconut_hint() | yes | output.sh:64-71 |

### test tree

| test case | implemented | evidence |
|-----------|-------------|----------|
| [case13.t0] single file | yes | line 601-647 |
| [case13.t1] directory | yes | line 650-680 |
| [case13.t2] duplicate | yes | line 683-704 |
| [case13.t3] symlink | yes | line 707-730 |
| [case13.t4] crickets | yes | line 733-744 |

## conclusion

all behavior declaration requirements covered:
- vision: 5/5 requirements implemented
- criteria: 10/10 usecases addressed
- blueprint: all components implemented with tests

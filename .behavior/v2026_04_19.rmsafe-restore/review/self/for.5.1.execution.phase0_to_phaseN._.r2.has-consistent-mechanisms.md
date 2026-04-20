# self-review: has-consistent-mechanisms

## scope

execution stone 5.1.execution.phase0_to_phaseN

## search for extant mechanisms

### mkdir + gitignore findsert pattern

searched: `mkdir -p` and `.gitignore` in src/domain.roles/mechanic/skills/*.sh

found: multiple commands do this inline
- git.commit.uses.local.sh:226-229
- git.commit.bind.sh:127-129
- git.repo.test.sh:483-488
- get.package.docs.sh:98-101

pattern: each command handles its own cache/local dir setup inline
no shared utility extant for this pattern

verdict: findsert_trash_dir() follows extant pattern (inline, not shared)

### output functions

searched: output.sh

found: output.sh is the shared output module for fileops skills
- print_turtle_header()
- print_tree_start()
- print_tree_branch()
- print_tree_leaf()
- print_tree_file_line()

pattern: shared output functions in output.sh

verdict: print_coconut_hint() correctly added to output.sh, follows extant pattern

## conclusion

both new mechanisms follow extant patterns:
1. findsert_trash_dir() - inline like other gitignore findserts
2. print_coconut_hint() - in output.sh like other output functions

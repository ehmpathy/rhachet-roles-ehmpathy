# self-review: has-consistent-conventions

## scope

execution stone 5.1.execution.phase0_to_phaseN

## search for extant conventions

### function name prefix

searched: output.sh function names

found: all output functions use `print_` prefix
- print_turtle_header
- print_tree_start
- print_tree_branch
- print_tree_leaf
- print_tree_file_line

verdict: `print_coconut_hint` follows extant `print_*` prefix

### variable name conventions

searched: `*_DIR=` across skills/*.sh

found: directory variables use `*_DIR` suffix
- SKILL_DIR (claude.tools skills)
- SCRIPT_DIR (git.commit skills)
- METER_DIR
- CACHE_DIR

verdict: `TRASH_DIR` follows extant `*_DIR` suffix

### internal function names

searched: function name patterns

found: internal functions use snake_case
- is_glob_pattern
- print_tree_branch

verdict: `findsert_trash_dir` follows extant snake_case convention

### term consistency

coconut emoji: used in git.release for "did you know?" hints
trash: new term, but descriptive and matches unix convention

## conclusion

all name conventions align with extant patterns:
- print_* for output functions
- *_DIR for directory variables
- snake_case for internal functions

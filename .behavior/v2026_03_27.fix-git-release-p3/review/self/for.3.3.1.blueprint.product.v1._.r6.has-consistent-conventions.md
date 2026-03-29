# review: has-consistent-conventions (r6)

reviewed blueprint for divergence from extant name conventions. searched git.release codebase for patterns.

---

## search conducted

### file name patterns

searched `src/domain.roles/mechanic/skills/git.release/*.sh`:

| pattern | examples | purpose |
|---------|----------|---------|
| `git.release.sh` | git.release.sh | main entry point |
| `git.release._.{name}.sh` | git.release._.emit_transport_watch.sh | internal operations |
| `git.release.operations.sh` | git.release.operations.sh | shared operations |
| `output.sh` | output.sh | output functions |

### function name patterns

searched operations.sh for `^[a-z_]+\(\)`:

| pattern | examples | purpose |
|---------|----------|---------|
| `get_*` | get_pr_for_branch, get_release_pr | read operations |
| `has_*` | has_automerge, has_conflicts | boolean checks |
| `is_*` | is_pr_merged | boolean checks |
| `needs_*` | needs_rebase | boolean checks |
| `parse_*` | parse_check_counts | parse data |
| `extract_*` | extract_tag_from_release_title | extract data |
| `format_*` | format_duration | format data |
| `show_*` | show_failed_checks_in_watch | display output |
| `enable_*` | enable_automerge | mutations |
| `_gh_*` | _gh_with_retry | internal gh calls |
| `print_*` | print_watch_poll (output.sh) | output functions |

### term conventions

searched for "await|wait|poll|watch" in git.release codebase:

| term | extant usage | location |
|------|--------------|----------|
| `await` | "💤 Ns delay to await" | git.release.sh:245, 251 |
| `wait` | "wait for tag push" | git.release.sh:870, 893 |
| `watch` | emit_transport_watch, watch loop for CI | emit_transport_watch.sh |
| `poll` | poll_interval, poll_sleep | multiple files |

**usage pattern**:
- `watch` = observe CI checks until terminal state (done, failed, timeout)
- `await` = wait for artifacts to appear (release PR, tag)
- `poll` = the interval logic within watch or await

---

## convention 1: file name

**blueprint**: `git.release._.and_then_await.sh`

**extant pattern**: `git.release._.{verb}_{noun}.sh`
- git.release._.emit_transport_watch.sh
- git.release._.emit_transport_status.sh
- git.release._.get_one_goal_from_input.sh

**analysis**: blueprint uses `git.release._.and_then_await.sh`
- prefix: `git.release._.` ✓ matches extant
- name: `and_then_await` — compound name with underscore

**verdict**: CONSISTENT. follows `git.release._.{name}.sh` pattern.

---

## convention 2: main function name

**blueprint**: `and_then_await()`

**extant pattern**: internal operations use descriptive names
- emit_transport_watch()
- emit_transport_status()
- get_one_transport_status()

**analysis**: `and_then_await` describes what it does (await after transition)

**verdict**: CONSISTENT. descriptive name that matches semantic pattern.

---

## convention 3: get_fresh_release_pr()

**blueprint line 53-60**: `get_fresh_release_pr()`

**extant pattern**: `get_*` for read operations
- get_pr_for_branch()
- get_release_pr()
- get_pr_status()

**analysis**:
- prefix: `get_` ✓ matches extant read pattern
- noun: `fresh_release_pr` — specific, descriptive

**verdict**: CONSISTENT. follows `get_*` pattern for read operations.

---

## convention 4: get_fresh_release_tag()

**blueprint line 62-69**: `get_fresh_release_tag()`

**extant pattern**: `get_*` for read operations
- get_latest_tag()
- get_tag_runs()

**analysis**:
- prefix: `get_` ✓ matches extant read pattern
- noun: `fresh_release_tag` — consistent with get_fresh_release_pr

**verdict**: CONSISTENT. follows `get_*` pattern and parallel to get_fresh_release_pr.

---

## convention 5: get_release_please_status()

**blueprint line 71-76**: `get_release_please_status()`

**extant pattern**: `get_*` for read operations
- get_pr_status()
- get_merge_state()

**analysis**:
- prefix: `get_` ✓ matches extant read pattern
- noun: `release_please_status` — descriptive

**verdict**: CONSISTENT. follows `get_*` pattern.

---

## convention 6: print_await_poll()

**blueprint line 81-83**: `print_await_poll()`

**extant pattern**: `print_*` for output functions (output.sh)
- print_watch_poll()
- print_watch_result()
- print_release_header()

**analysis**:
- prefix: `print_` ✓ matches extant output pattern
- noun: `await_poll` — parallel to print_watch_poll

**verdict**: CONSISTENT. follows `print_*` pattern and parallel to watch functions.

---

## convention 7: print_await_result()

**blueprint line 85-87**: `print_await_result()`

**extant pattern**: `print_*` for output functions
- print_watch_result()
- print_check_status()

**analysis**:
- prefix: `print_` ✓ matches extant output pattern
- noun: `await_result` — parallel to print_watch_result

**verdict**: CONSISTENT. follows `print_*` pattern and parallel to watch functions.

---

## convention 8: print_workflow_status()

**blueprint line 89-91**: `print_workflow_status()`

**extant pattern**: `print_*` for output functions
- print_check_status()
- print_automerge_status()

**analysis**:
- prefix: `print_` ✓ matches extant output pattern
- noun: `workflow_status` — parallel to print_check_status

**verdict**: CONSISTENT. follows `print_*` pattern.

---

## convention 9: test file name

**blueprint line 23**: `git.release.p4.and_then_await.integration.test.ts`

**extant pattern**: `git.release.{phase}.{name}.integration.test.ts`
- git.release.p1.integration.test.ts
- git.release.p2.integration.test.ts
- git.release.p3.scenes.on_feat.into_main.integration.test.ts

**analysis**:
- prefix: `git.release.p4.` ✓ follows phase pattern
- name: `and_then_await` ✓ describes what is tested
- suffix: `.integration.test.ts` ✓ matches extant

**verdict**: CONSISTENT. follows extant test file pattern.

---

## summary

| name | extant pattern | matches? |
|------|---------------|----------|
| git.release._.and_then_await.sh | git.release._.{name}.sh | ✓ |
| and_then_await() | descriptive internal ops | ✓ |
| get_fresh_release_pr() | get_* for reads | ✓ |
| get_fresh_release_tag() | get_* for reads | ✓ |
| get_release_please_status() | get_* for reads | ✓ |
| print_await_poll() | print_* for output | ✓ |
| print_await_result() | print_* for output | ✓ |
| print_workflow_status() | print_* for output | ✓ |
| git.release.p4...test.ts | git.release.{phase}...test.ts | ✓ |

**question: do we introduce new terms when extant terms exist?**

| blueprint term | extant term? | evidence |
|----------------|-------------|----------|
| `await` | YES | git.release.sh:245, 251 uses "await" |
| `poll` | YES | emit_transport_watch.sh:113 uses "poll_interval" |
| `fresh` | NEW | no prior use of "fresh" for commit ancestry |

**fresh** is a new term. analysis:
- "fresh" describes artifacts whose commits are ahead of prior merge
- alternatives: "valid", "current", "updated"
- "fresh" is most accurate: the artifact is freshly created after the merge
- no extant term for this concept exists

**verdict**: "fresh" is a justified new term. it precisely describes the commit ancestry check.

**conclusion**: all names follow extant conventions. one new term ("fresh") is introduced for a new concept with no extant equivalent.


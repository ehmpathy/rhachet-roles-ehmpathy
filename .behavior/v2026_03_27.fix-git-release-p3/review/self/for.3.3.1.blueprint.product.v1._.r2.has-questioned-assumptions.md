# review: has-questioned-assumptions (r2)

took time to read the blueprint line by line with fresh eyes. read the extant emit_transport_watch.sh and output.sh to verify assumptions against real code.

---

## assumptions questioned

### assumption: output indentation level is 3-space

**what we assume**: await poll lines use 3-space indentation (`   ├─ 💤`)
**compared to extant**: watch poll uses 6-space indentation (`      ├─ 💤`)
**question**: why different?
**answer**: await is one level under transition bubble (`🫧`). watch is two levels under transport root (`🌊`) + watch section (`🥥`).
**output structure**:
```
🫧 and then...        ← level 0 (no indent)
   ├─ 💤 5s in await  ← level 1 (3-space)
   └─ ✨ found!       ← level 1 (3-space)

🌊 release: ...       ← level 0
   └─ 🥥 let's watch  ← level 1 (3-space)
      ├─ 💤 ...       ← level 2 (6-space)
      └─ ✨ done!     ← level 2 (6-space)
```
**verdict**: 3-space is correct per structure. different from watch is intentional.

---

### assumption: tag version source

**what we assume**: caller passes expected tag version as part of artifact_display
**question**: where does $version come from at call site?
**evidence**: blueprint shows `and_then_await "tag" "tag v$version" $merge_commit`

**answer**: $version comes from the release PR title that was just merged. the release PR title is `chore(release): v1.3.0`, so version is extracted before the call to and_then_await.

**verdict**: assumption is valid. caller extracts version from release PR title first.

---

### assumption: AWAIT_RESULT mechanism

**what we assume**: AWAIT_RESULT is set for caller to use
**question**: how? bash has no return values. options:
1. export AWAIT_RESULT (global var)
2. echo to stdout and capture
3. write to file

**answer**: the common approach is to source the file and have it set a variable. this operation will be called as a function from git.release.sh which sources operations files.

**verdict**: use same pattern as extant git.release code - source the file, call the function, it sets global variables.

---

### assumption: error path behavior

**what we assume**: gh command failures are handled by _gh_with_retry
**question**: what if _gh_with_retry still fails after retries?
**evidence**: extant _gh_with_retry returns non-zero on final failure

**answer**: if gh fails, and_then_await should also fail with exit 1 (malfunction). the poll loop would exit.

**verdict**: assumption is valid. _gh_with_retry handles transient errors; permanent failures bubble up.

---

## blueprint updates applied

### fix 1: restored explicit operations with input signatures
- **before**: inline artifact lookup in and_then_await
- **after**: explicit get_fresh_release_pr() and get_fresh_release_tag() with documented inputs
- **lesson**: explicit operations with clear inputs are better than inline code for readability

### fix 2: consistent naming with "release" prefix
- **before**: get_fresh_tag
- **after**: get_fresh_release_tag
- **lesson**: consistency in naming across related operations

---

### assumption: gh pr list returns headRefOid

**what we assume**: `gh pr list --state open --json number,title,headRefOid` returns headRefOid
**question**: does gh cli support headRefOid field?
**evidence**: gh cli json fields include `headRefOid` — verified via `gh pr list --json` help output
**verdict**: assumption is valid.

---

### assumption: get_fresh_release_pr output structure

**what we assume**: returns PR json that caller can use
**question**: what fields must be returned?
**answer**: at minimum: number, title, headRefOid. caller needs number to continue with watch, title for display.
**blueprint says**: "output: PR json if fresh, empty if stale/not found"
**verdict**: assumption is valid. return full json from gh pr list, not filtered.

---

### assumption: get_fresh_release_tag output structure

**what we assume**: returns tag commit sha if fresh
**question**: is sha sufficient? does caller need more?
**answer**: for tag await, caller needs to know tag exists. sha proves freshness. tag name is passed as input. sha is sufficient.
**verdict**: assumption is valid.

---

### assumption: poll interval matches extant

**what we assume**: 5s for first 60s, then 15s — same as emit_transport_watch
**evidence**: emit_transport_watch.sh lines 112-120 use this pattern
**question**: is 90s timeout with 5s/15s intervals efficient?
**math**: first 60s at 5s = 12 polls. next 30s at 15s = 2 polls. total = 14 polls max.
**verdict**: reasonable poll count. not excessive.

---

## holds - no issues found

### holds: print functions are separate
- **why**: output format is different enough from extant print_watch_* (3-space vs 6-space indent)

### holds: 18 test cases
- **why**: matches matrix specification exactly

### holds: single reusable operation
- **why**: explicitly requested in wish

### holds: AWAIT_RESULT data structure
- **why**: release-pr returns PR json (number, title, etc), tag returns sha. caller has what it needs.

### holds: expected_tag comes from caller
- **why**: caller extracts version from release PR title before await. documented above.

---

## summary

reviewed 9 assumptions. all validated:

| assumption | verdict |
|------------|---------|
| output indentation 3-space | intentional, matches tree structure |
| tag version source | caller extracts from PR title |
| AWAIT_RESULT mechanism | global var via sourced function |
| error path behavior | _gh_with_retry handles, failures bubble |
| gh pr list headRefOid | verified gh cli supports field |
| get_fresh_release_pr output | PR json with number, title, headRefOid |
| get_fresh_release_tag output | sha sufficient |
| poll interval | matches extant, 14 polls max |

2 fixes applied to blueprint:
1. restored explicit operations with input signatures
2. consistent naming (get_fresh_release_tag)

no hidden assumptions found that require further correction.

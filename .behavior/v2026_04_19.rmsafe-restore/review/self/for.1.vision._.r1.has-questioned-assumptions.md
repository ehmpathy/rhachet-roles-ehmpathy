# self-review: has-questioned-assumptions

## assumptions questioned

### 1. "path structure preserved in trash"

**assumed:** `trash/path/to/file.ts` mirrors original location
**evidence?** inferred from wish — not explicitly stated
**what if opposite?** flat structure with encoded filenames (e.g., `trash/path_to_file.ts`)
**wisher said?** no — I inferred this
**counterexamples?** macOS trash uses encoded paths, not mirrored structure
**verdict:** ISSUE — this is an unstated assumption. mirrored structure is intuitive but could cause deep nesting. should be explicit in design.

**fix:** added to open questions in vision — "should trash mirror path structure or flatten?"

### 2. "cpsafe is available and works for restore"

**assumed:** cpsafe extant and handles the restore usecase
**evidence?** wish explicitly says "cpsafe out of the trash cache"
**what if opposite?** cpsafe doesn't handle all edgecases
**wisher said?** yes — explicit
**counterexamples?** none known
**verdict:** holds — wisher's explicit choice

### 3. "one trash location per repo"

**assumed:** single trash dir at `.agent/.cache/.../trash/`
**evidence?** wish specifies this path
**what if opposite?** per-directory trash? per-branch trash?
**wisher said?** yes — single location specified
**counterexamples?** none — wish is clear
**verdict:** holds — explicit in wish

### 4. "files are copied, not moved"

**assumed:** we `cp` then `rm`, not `mv`
**evidence?** implicit — "first cp into trash"
**what if opposite?** `mv` to trash would be atomic and faster
**wisher said?** "first cp" suggests copy-then-delete
**counterexamples?** `mv` could fail across filesystems
**verdict:** holds — cp-then-rm is safer (works across mounts, preserves original on copy failure)

### 5. "trash dir created on demand"

**assumed:** mkdir + findsert gitignore when first file trashed
**evidence?** wish says "findserted on mkdir of that trash dir"
**what if opposite?** pre-create trash dir on repo init?
**wisher said?** "on mkdir" implies on-demand
**counterexamples?** none
**verdict:** holds — lazy creation is correct

### 6. "restore hint shown for every delete"

**assumed:** always show restore command in output
**evidence?** wish says "at the end express how one can restore"
**what if opposite?** only show on request? only show for single file?
**wisher said?** "at the end" implies always
**counterexamples?** none — discoverability matters
**verdict:** holds — always show is better UX

### 7. "no confirmation prompt"

**assumed:** rmsafe continues to delete without confirmation
**evidence?** current behavior, wish says no mention of prompts
**what if opposite?** add "are you sure?" prompt
**wisher said?** silent on prompts
**counterexamples?** trash provides safety net, prompt unnecessary
**verdict:** holds — trash eliminates need for confirmation

## issues found and fixed

1. **path structure assumption** — added to open questions in vision

## conclusion

one hidden assumption surfaced (path structure). all others trace to wish or reasonable inference. vision updated to flag the assumption.

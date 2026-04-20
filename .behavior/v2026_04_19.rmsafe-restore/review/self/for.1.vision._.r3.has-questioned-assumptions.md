# self-review r3: has-questioned-assumptions

slowed down. tea in hand. fresh eyes.

re-read the vision line by line. challenged each claim.

## the vision claims these outcomes

### claim: "Instead of panic or git checkout dance"

**what's assumed?** that git checkout is hard or slow
**evidence?** anecdotal — users often forget exact syntax
**what if opposite?** git checkout is trivial for tracked files
**verdict:** holds — trash helps untracked files most. git checkout only works for committed content. the value is for uncommitted work.

### claim: "user confidence: it's in the trash"

**what's assumed?** users will trust the trash
**evidence?** desktop OS pattern established over decades
**what if opposite?** users might not notice trash extant
**verdict:** holds — the output explicitly shows restore path. hard to miss.

### claim: "restore from trash" via cpsafe

**what's assumed?** cpsafe is intuitive
**evidence?** users might not know cpsafe syntax
**what if opposite?** cpsafe is unclear, users get stuck
**verdict:** holds — output shows exact command to run. copy-paste.

## assumptions I added but wisher didn't say

### 1. "trash/path/to/file.ts mirrors structure"

**wisher said?** no — wisher said "cp into @gitroot/.agent/.cache/.../trash/"
**evidence?** I inferred structure preservation
**what if opposite?** flat dir with encoded names
**verdict:** mirrored structure is clearer for humans. but flagged as open question.

### 2. "single version in trash"

**wisher said?** no — not mentioned
**evidence?** simpler implementation
**what if opposite?** timestamped versions
**verdict:** flagged as open question for wisher

### 3. "no auto-cleanup"

**wisher said?** no — not mentioned
**evidence?** simpler, manual control
**what if opposite?** auto-expire after N days
**verdict:** flagged as open question for wisher

### 4. "symlinks trashed as links"

**wisher said?** no
**evidence?** current rmsafe already handles symlinks this way
**what if opposite?** would be a surprise
**verdict:** added to assumptions and edgecases. correct behavior.

### 5. "parent mkdir on restore"

**wisher said?** no
**evidence?** necessary for restore to work
**what if opposite?** restore fails with obscure error
**verdict:** added to edgecases. cpsafe must handle or fail clearly.

## what I might still lack

### worktrees

this repo uses git worktrees. the vision says ".agent/.cache/..." but what if someone runs rmsafe in a worktree? does `.agent/` extant at worktree root or main repo root?

**check:** in current worktree, is there `.agent/` dir?

this might need research or explicit handle logic.

### performance on large files

if someone deletes a 1GB video, we copy 1GB to trash then delete. that's slow. no warn message.

**verdict:** acceptable for v1. can add --no-trash flag later if needed.

### what counts as "trash dir doesn't exist"?

vision says "create it + findsert .gitignore". but what if:
- `.agent/` extant but `.cache/` absent?
- `.agent/.cache/` extant but `repo=ehmpathy/` absent?

**verdict:** mkdir -p handles this. non-issue.

## issues found

1. **worktree behavior** — unspecified. does trash live at worktree root or main repo root?

## fix applied

added to open questions:
- **worktrees?** — if in worktree, which `.agent/.cache/` is used?

## conclusion

the vision is solid. key open questions flagged:
1. timestamped trash vs single version
2. path structure (mirror vs flat)
3. worktree behavior

all other assumptions are reasonable inferences from the wish or standard patterns.

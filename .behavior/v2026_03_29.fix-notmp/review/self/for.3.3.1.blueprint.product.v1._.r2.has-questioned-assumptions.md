# self-review r2: has-questioned-assumptions (deeper)

## missed assumption: Bash write detection is incomplete

**what we assume**: regex `> /tmp/` and `>> /tmp/` catches Bash writes

**what we missed**: other Bash write patterns:
- `tee /tmp/foo` — writes without redirect
- `cp file /tmp/foo` — copy to /tmp
- `mv file /tmp/foo` — move to /tmp
- `touch /tmp/foo` — create file
- `dd of=/tmp/foo` — dd output
- `curl -o /tmp/foo` — download to /tmp

**evidence of issue**: the blueprint only checks `> /tmp/` and `>> /tmp/`

**fix**: expand Bash write detection to include:
- output redirect: `> /tmp/` or `>> /tmp/`
- tee: `tee /tmp/` or `tee -a /tmp/`
- cp: `cp .* /tmp/`
- mv: `mv .* /tmp/`

**update to blueprint**:
```
├─ [+] detect /tmp write
│  ├─ [+] check if file_path starts with /tmp/
│  └─ [+] check if command contains /tmp write pattern
│       ├─ [+] output redirect: > /tmp/ or >> /tmp/
│       ├─ [+] tee: tee /tmp/ or tee -a /tmp/
│       ├─ [+] cp: target is /tmp/
│       └─ [+] mv: target is /tmp/
```

**verdict: issue found** — expanded detection patterns needed

---

## missed assumption: Read tool usage

**what we assume**: users will want to use Read tool for /tmp paths

**what wish actually shows**: `tail -50 /tmp/claude-1000/...` — this is Bash, not Read tool

**question**: do users ever use Read tool for /tmp, or always Bash?

**assessment**:
- Read tool is for Claude to read files
- Users often invoke `cat`, `tail`, `head` via Bash
- The Read tool permission is speculative

**verdict: non-issue** — deferred as "open item" already; we test and add if needed

---

## missed assumption: hook timeout is sufficient

**what we assume**: PT5S (5 seconds) timeout is enough

**what if opposite?** hook times out and behavior fails

**evidence**: extant hooks use 5 second timeout
- citation: settings.json shows `"timeout": 5` for other PreToolUse hooks

**verdict: holds** — 5 seconds is consistent with extant hooks

---

## missed assumption: matcher syntax is correct

**what we assume**: `Write|Edit|Bash` is valid matcher syntax

**evidence**: extant settings.json uses this format
- citation: line 83 of settings.json: `"matcher": "Write|Edit"`

**verdict: holds** — proven by extant config

---

## summary

| assumption | status | action |
|------------|--------|--------|
| Bash redirect detection is complete | **issue** | expand patterns |
| Read tool permission needed | non-issue | already deferred |
| 5 second timeout | holds | no change |
| Write\|Edit\|Bash matcher syntax | holds | no change |

## update to blueprint — FIXED

the Bash write detection codepath needed expansion to catch:
- tee commands
- cp to /tmp
- mv to /tmp

**fix applied**: updated blueprint lines 40-48 to expand detection patterns:
```
├─ [+] detect /tmp write
│  ├─ [+] check if file_path starts with /tmp/
│  └─ [+] check if command writes to /tmp/
│       ├─ output redirect: > /tmp/ or >> /tmp/
│       ├─ tee: tee /tmp/ or tee -a /tmp/
│       ├─ cp: cp ... /tmp/
│       └─ mv: mv ... /tmp/
```

**fix applied**: updated test codepaths to cover new patterns:
```
├─ [+] test: Bash > /tmp/* blocks (redirect)
├─ [+] test: Bash tee /tmp/* blocks
├─ [+] test: Bash cp to /tmp/* blocks
├─ [+] test: Bash mv to /tmp/* blocks
```

this was a fix to the blueprint, not the vision or criteria.

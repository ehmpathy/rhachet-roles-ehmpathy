# self-review r8: has-ergonomics-validated

## no repros artifact for this behavior

this behavior skipped the repros phase. no input/output was pre-sketched.

## vision as the reference

the vision document (1.vision.yield.md) described the expected output:

> **vision line 28:**
> ```
> skill: "error: git.repo.test must run in foreground. use Bash without run_in_background."
> ```

## actual implemented output

```
🛑 BLOCKED: git.repo.test must run in foreground

background + poll wastes tokens (2500+ vs 50 from curated output).
the skill is designed to minimize token consumption - foreground is required.

fix: remove run_in_background from your Bash tool call

instead of:
  Bash(command: 'rhx git.repo.test ...', run_in_background: true)

use:
  Bash(command: 'rhx git.repo.test ...')
```

## comparison

| element | vision | implementation | drift? |
|---------|--------|----------------|--------|
| core message | "must run in foreground" | "must run in foreground" | no |
| guidance | "use Bash without run_in_background" | "remove run_in_background" | equivalent |
| explanation | not specified | added "wastes tokens" | enhancement |
| example | not specified | added before/after | enhancement |

## drift analysis

the implementation is **more detailed** than the vision, not less:
- added explanation of WHY (token savings)
- added concrete before/after example
- added emoji for visual clarity

this is enhancement, not regression.

## why it holds

1. **core message matches vision.** "must run in foreground"
2. **guidance matches vision.** "remove run_in_background"
3. **enhancements are additive.** more detail, not less

## gaps found

none. ergonomics match or exceed what was planned.

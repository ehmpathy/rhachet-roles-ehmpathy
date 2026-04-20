# self-review: has-consistent-mechanisms (r3)

## deeper review

re-examined code for mechanism consistency with fresh eyes.

### cp -P flag usage

searched: `cp -P` and `cp -rP` in skills/*.sh

found:
- cpsafe.sh:226 uses `cp -P` for file copy (preserve symlinks)
- rmsafe.sh:178 uses `cp -rP` for directory trash (preserve symlinks)
- rmsafe.sh:254 uses `cp -P` for file trash (preserve symlinks)

verdict: consistent with extant cpsafe pattern. same flag, same reason.

### symlink path computation

examined: the FIRST_DIR/FIRST_BASE logic for symlink path computation

this logic mirrors the TARGET_ABS computation earlier in the same file (lines 146-153, 222-230). the pattern is already extant in rmsafe.sh for the main removal logic.

verdict: consistent with extant pattern within same file.

### why this holds

the implementation reuses:
1. output.sh functions (extant shared module)
2. cp -P flag (same as cpsafe.sh)
3. inline findsert pattern (same as git.commit.uses.local.sh et al)
4. symlink path computation (same as extant rmsafe.sh logic)

no novel mechanisms were introduced.

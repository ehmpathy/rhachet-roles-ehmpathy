#!/usr/bin/env bash
######################################################################
# .what = remind mechanic to verify claims after compaction
#
# .why  = compaction summaries may contain stale conclusions.
#         the orphan processes incident showed how blind trust
#         in inherited diagnoses leads to wasted effort.
#
# usage:
#   fires automatically via PostCompact hook
#
# guarantee:
#   ✔ informational only: emits reminder to stdout
#   ✔ allows continuation: always exits 0
######################################################################

set -euo pipefail

# emit reminder
cat << 'EOF'
⚠️ compaction occurred

inherited claims may be stale:
- diagnoses ("X is the problem")
- assumptions ("Y is true")
- objectives ("we need to do Z")
- observations ("file contains W")
- conclusions ("the fix is V")

verify before you act. question all, especially yourself.

see: rule.require.trust-but-verify
EOF

exit 0

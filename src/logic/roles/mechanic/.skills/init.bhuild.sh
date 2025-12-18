#!/usr/bin/env bash
######################################################################
# .what = initialize a .behavior directory for bhuild thoughtroute
#
# .why  = standardize the behavior-driven development thoughtroute
#         by scaffolding a structured directory with:
#           - wish definition
#           - vision statement
#           - acceptance criteria
#           - research prompts
#           - distillation prompts
#           - blueprint prompts
#           - roadmap prompts
#           - execution prompts
#           - feedback template
#
# .how  = creates .behavior/v${isodate}.${behaviorname}/ with
#         all necessary scaffold files for the bhuild thoughtroute
#
# usage:
#   init.bhuild.sh --name <behaviorname> [--dir <directory>]
#
# guarantee:
#   - creates .behavior/ if missing
#   - creates versioned behavior directory
#   - findserts all thoughtroute files (creates if missing, skips if exists)
#   - idempotent: safe to rerun
#   - fail-fast on errors
######################################################################

set -euo pipefail

# fail loud: print what failed
trap 'echo "❌ init.bhuild.sh failed at line $LINENO" >&2' ERR

# parse arguments
BEHAVIOR_NAME=""
TARGET_DIR="$PWD"
while [[ $# -gt 0 ]]; do
  case $1 in
    --name)
      BEHAVIOR_NAME="$2"
      shift 2
      ;;
    --dir)
      TARGET_DIR="$2"
      shift 2
      ;;
    *)
      echo "error: unknown argument '$1'"
      echo "usage: init.bhuild.sh --name <behaviorname> [--dir <directory>]"
      exit 1
      ;;
  esac
done

# validate required arguments
if [[ -z "$BEHAVIOR_NAME" ]]; then
  echo "error: --name is required"
  echo "usage: init.bhuild.sh --name <behaviorname> [--dir <directory>]"
  exit 1
fi

# generate isodate in format YYYY_MM_DD
ISO_DATE=$(date +%Y_%m_%d)

# trim trailing .behavior from TARGET_DIR if present
TARGET_DIR="${TARGET_DIR%/.behavior}"
TARGET_DIR="${TARGET_DIR%.behavior}"

# construct behavior directory path (absolute)
BEHAVIOR_DIR="$TARGET_DIR/.behavior/v${ISO_DATE}.${BEHAVIOR_NAME}"

# compute relative path from caller's $PWD for file contents
BEHAVIOR_DIR_REL="$(realpath --relative-to="$PWD" "$TARGET_DIR")/.behavior/v${ISO_DATE}.${BEHAVIOR_NAME}"
# normalize: remove leading ./ if present
BEHAVIOR_DIR_REL="${BEHAVIOR_DIR_REL#./}"

# create behavior directory (idempotent)
mkdir -p "$BEHAVIOR_DIR"

# helper: findsert file (create if missing, skip if exists)
findsert() {
  local filepath="$1"
  if [[ -f "$filepath" ]]; then
    echo "   [KEEP] $(basename "$filepath")"
    return 0
  fi
  cat > "$filepath"
  echo "   [CREATE] $(basename "$filepath")"
}

# findsert 0.wish.md
findsert "$BEHAVIOR_DIR/0.wish.md" << 'EOF'
wish =

EOF

# findsert 1.vision.md
findsert "$BEHAVIOR_DIR/1.vision.md" << 'EOF'

EOF

# findsert 2.criteria.md
findsert "$BEHAVIOR_DIR/2.criteria.md" << 'EOF'
# usecase.1 = ...
given()
  when()
    then()
      sothat()
    then()
    then()
      sothat()
  when()
    then()

given()
  ...

# usecase.2 = ...
...
EOF

# findsert 2.criteria.src
findsert "$BEHAVIOR_DIR/2.criteria.src" << 'EOF'
declare the behavioral criteria required in order to fulfill
- this wish $BEHAVIOR_DIR_REL/0.wish.md
- this vision $BEHAVIOR_DIR_REL/1.vision.md (if declared)

via bdd declarations, per your briefs

via the template in $BEHAVIOR_DIR/2.criteria.md

emit into $BEHAVIOR_DIR/2.criteria.md

---

focus on the behavioral requirements
- critical paths
- boundary paths

ignore infra or technical details

focus on behaviors

ensure to cover all of the criteria required to fulfill the full set of behaviors declared in the wish and vision
EOF

# findsert 3.1.research.domain._.v1.src
findsert "$BEHAVIOR_DIR/3.1.research.domain._.v1.src" << EOF
research the domain available in order to fulfill
- this wish $BEHAVIOR_DIR_REL/0.wish.md
- this vision $BEHAVIOR_DIR_REL/1.vision.md (if declared)
- this criteria $BEHAVIOR_DIR_REL/2.criteria.md (if declared)

specifically
- what are the domain objects that are involved with this wish
  - entities
  - events
  - literals
- what are the domain operations
  - getOne
  - getAll
  - setCreate
  - setUpdate
  - setDelete
- what are the relationships between the domain objects?
  - is there a treestruct of decoration?
  - is there a treestruct of common subdomains?
  - are there dependencies?
- how do the domain objects and operations compose to support wish?

---

use web search to discover and research
- cite every claim
- number each citation
- clone exact quotes from each citation

focus on these sdk's for reference, if provided
-

---

emit into $BEHAVIOR_DIR_REL/3.1.research.domain._.v1.i1.md
EOF

# findsert 3.2.distill.domain._.v1.src
findsert "$BEHAVIOR_DIR/3.2.distill.domain._.v1.src" << EOF
distill the declastruct domain.objects and domain.operations that would
- enable fulfillment of
  - this wish $BEHAVIOR_DIR_REL/0.wish.md
  - this vision $BEHAVIOR_DIR_REL/1.vision.md (if declared)
  - this criteria $BEHAVIOR_DIR_REL/2.criteria.md (if declared)
- given the research declared here
  - $BEHAVIOR_DIR_REL/3.1.research.domain._.v1.i1.md (if declared)

procedure
1. declare the usecases and envision the contract that would be used to fulfill the usecases
2. declare the domain.objects, domain.operations, and access.daos that would fulfill this, via the declastruct pattern in this repo

emit into
- $BEHAVIOR_DIR_REL/3.2.distill.domain._.v1.i1.md
EOF

# findsert 3.3.blueprint.v1.src
findsert "$BEHAVIOR_DIR/3.3.blueprint.v1.src" << EOF
propose a blueprint for how we can implement the wish described
- in $BEHAVIOR_DIR_REL/0.wish.md

with the domain distillation declared
- in $BEHAVIOR_DIR_REL/3.2.distill.domain._.v1.i1.md (if declared)

follow the patterns already present in this repo

---

reference the below for full context
- $BEHAVIOR_DIR_REL/0.wish.md
- $BEHAVIOR_DIR_REL/1.vision.md (if declared)
- $BEHAVIOR_DIR_REL/2.criteria.md (if declared)
- $BEHAVIOR_DIR_REL/3.1.research.domain._.v1.i1.md (if declared)
- $BEHAVIOR_DIR_REL/3.2.distill.domain._.v1.i1.md (if declared)

---

emit to $BEHAVIOR_DIR_REL/3.3.blueprint.v1.i1.md
EOF

# findsert 4.1.roadmap.v1.src
findsert "$BEHAVIOR_DIR/4.1.roadmap.v1.src" << EOF
declare a roadmap,

- checklist style
- with ordered dependencies
- with behavioral acceptance criteria
- with behavioral acceptance verification at each step

for how to execute the blueprint specified in $BEHAVIOR_DIR_REL/3.3.blueprint.v1.i1.md

ref:
- $BEHAVIOR_DIR_REL/0.wish.md
- $BEHAVIOR_DIR_REL/1.vision.md (if declared)
- $BEHAVIOR_DIR_REL/2.criteria.md (if declared)
- $BEHAVIOR_DIR_REL/3.2.distill.domain._.v1.i1.md (if declared)
- $BEHAVIOR_DIR_REL/3.3.blueprint.v1.i1.md

---

emit into $BEHAVIOR_DIR_REL/4.1.roadmap.v1.i1.md
EOF

# findsert 5.1.execution.phase0_to_phaseN.v1.src
findsert "$BEHAVIOR_DIR/5.1.execution.phase0_to_phaseN.v1.src" << EOF
bootup your mechanic's role via \`npx rhachet roles boot --repo ehmpathy --role mechanic\`

then, execute
- phase0 to phaseN
of roadmap
- $BEHAVIOR_DIR_REL/4.1.roadmap.v1.i1.md

ref:
- $BEHAVIOR_DIR_REL/0.wish.md
- $BEHAVIOR_DIR_REL/1.vision.md (if declared)
- $BEHAVIOR_DIR_REL/2.criteria.md (if declared)
- $BEHAVIOR_DIR_REL/3.2.distill.domain._.v1.i1.md (if declared)
- $BEHAVIOR_DIR_REL/3.3.blueprint.v1.i1.md


---

track your progress

emit todos and check them off into
- $BEHAVIOR_DIR_REL/5.1.execution.phase0_to_phaseN.v1.i1.md
EOF

# findsert .ref.[feedback].v1.[given].by_human.md
findsert "$BEHAVIOR_DIR/.ref.[feedback].v1.[given].by_human.md" << EOF
emit your response to the feedback into
- $BEHAVIOR_DIR_REL/.ref.[feedback].v1.[taken].by_robot.md

1. emit your response checklist
2. exec your response plan
3. emit your response checkoffs into the checklist

---

first, bootup your mechanics briefs again

npx rhachet roles boot --repo ehmpathy --role mechanic

---
---
---


# blocker.1

---

# nitpick.2

---

# blocker.3
EOF

echo ""
echo "behavior thoughtroute initialized!"
echo "   $BEHAVIOR_DIR"

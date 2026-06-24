#!/usr/bin/env bash
######################################################################
# .what = manage org-level git commit permissions for mechanics
#
# .why  = humans can allow/block commits per org:
#         - specific org overrides @all default
#         - @all resets all orgs and sets default
#         - org config is overridden by local repo config
#
# usage:
#   git.commit.uses --org ehmpathy allow   # allow commits for ehmpathy
#   git.commit.uses --org ahbode block     # block commits for ahbode
#   git.commit.uses --org @all allow       # allow all orgs (reset + default)
#   git.commit.uses --org @all block       # block all orgs (reset + default)
#   git.commit.uses --org ehmpathy del     # remove ehmpathy config, defer to @all
#   git.commit.uses --org get              # show all org configs
#   git.commit.uses --org ehmpathy get     # show config for specific org
#
# guarantee:
#   - state stored at ~/.rhachet/storage/repo=ehmpathy/role=mechanic/.meter/
#   - specific org config overrides @all
#   - org config is overridden by local repo config
######################################################################
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/output.sh"

# ensure we're in a git repo
if ! git rev-parse --git-dir > /dev/null 2>&1; then
  echo "error: not in a git repository"
  exit 2
fi

# org state path
ROLE_REPO="ehmpathy"
ROLE_SLUG="mechanic"
GLOBAL_METER_DIR="$HOME/.rhachet/storage/repo=$ROLE_REPO/role=$ROLE_SLUG/.meter"
ORG_STATE_FILE="$GLOBAL_METER_DIR/git.commit.uses.org.jsonc"

# parse args
ORG_NAME=""
COMMAND=""

# first positional arg could be org name or command
if [[ $# -ge 1 && "$1" != --* ]]; then
  # check if it's a command
  case "$1" in
    allow|block|del|get)
      COMMAND="$1"
      shift
      ;;
    *)
      ORG_NAME="$1"
      shift
      ;;
  esac
fi

while [[ $# -gt 0 ]]; do
  case $1 in
    allow|block|del|get)
      COMMAND="$1"
      shift
      ;;
    --help|-h)
      echo "usage: git.commit.uses --org <org> allow|block|del"
      echo "       git.commit.uses --org @all allow|block"
      echo "       git.commit.uses --org get"
      echo "       git.commit.uses --org <org> get"
      echo ""
      echo "commands:"
      echo "  allow        allow commits for this org"
      echo "  block        block commits for this org"
      echo "  del          remove org config, defer to @all"
      echo "  get          show org config(s)"
      echo ""
      echo "special values:"
      echo "  @all         sets default for all orgs (resets all + sets default)"
      echo ""
      echo "options:"
      echo "  --help, -h   show this help"
      exit 0
      ;;
    --repo|--role|--skill|--local|--global|--org)
      # rhachet passthrough args - ignore
      shift
      # if next arg exists and is not a flag, skip it too
      if [[ $# -gt 0 && "$1" != --* && "$1" != -* ]]; then
        shift
      fi
      ;;
    --)
      shift
      ;;
    --*)
      echo "error: unknown option: $1"
      exit 2
      ;;
    *)
      # positional arg - could be org name
      if [[ -z "$ORG_NAME" ]]; then
        ORG_NAME="$1"
      fi
      shift
      ;;
  esac
done

# validate command
if [[ -z "$COMMAND" ]]; then
  echo "error: command required (allow, block, del, or get)"
  echo "usage: git.commit.uses --org <org> allow|block|del|get"
  exit 2
fi

# typo protection: all/ALL → suggest @all
if [[ "$ORG_NAME" == "all" || "$ORG_NAME" == "ALL" ]]; then
  print_turtle_header "bummer dude..."
  print_tree_start "git.commit.uses $COMMAND --org $ORG_NAME"
  echo "   └─ error: did you mean @all?"
  exit 2
fi

######################################################################
# guard: mutation commands require TTY (human only)
# note: __I_AM_HUMAN=true allows integration tests to run mutations
######################################################################
case "$COMMAND" in
  allow|block|del)
    if [[ ! -t 0 && "${__I_AM_HUMAN:-}" != "true" ]]; then
      print_turtle_header "bummer dude..."
      print_tree_start "git.commit.uses $COMMAND --org $ORG_NAME"
      print_tree_error "only humans can run this command"
      exit 2
    fi
    ;;
esac

######################################################################
# operations: read/write org state file
######################################################################
read_org_file() {
  if [[ -f "$ORG_STATE_FILE" ]]; then
    cat "$ORG_STATE_FILE"
  else
    echo '{ "orgs": {} }'
  fi
}

write_org_file() {
  local content="$1"
  mkdir -p "$GLOBAL_METER_DIR"
  echo "$content" > "$ORG_STATE_FILE"
}

######################################################################
# commands
######################################################################
case "$COMMAND" in
  allow)
    if [[ -z "$ORG_NAME" ]]; then
      echo "error: org name required for allow"
      echo "usage: git.commit.uses --org <org> allow"
      exit 2
    fi

    CURRENT=$(read_org_file)

    if [[ "$ORG_NAME" == "@all" ]]; then
      # @all: reset all orgs to allowed + set @all default
      UPDATED=$(echo '{ "orgs": { "@all": "allowed" } }')
      write_org_file "$UPDATED"

      print_turtle_header "shell yeah, back in the water!"
      print_tree_start "git.commit.uses allow --org @all"
      echo "   ├─ reset: all orgs → allowed"
      echo "   └─ @all: allowed"
    else
      # specific org: set to allowed
      UPDATED=$(echo "$CURRENT" | jq ".orgs[\"$ORG_NAME\"] = \"allowed\"")
      write_org_file "$UPDATED"

      print_turtle_header "shell yeah, back in the water!"
      print_tree_start "git.commit.uses allow --org $ORG_NAME"
      echo "   └─ $ORG_NAME: allowed"
    fi
    ;;

  block)
    if [[ -z "$ORG_NAME" ]]; then
      echo "error: org name required for block"
      echo "usage: git.commit.uses --org <org> block"
      exit 2
    fi

    CURRENT=$(read_org_file)

    if [[ "$ORG_NAME" == "@all" ]]; then
      # @all: reset all orgs to blocked + set @all default
      UPDATED=$(echo '{ "orgs": { "@all": "blocked" } }')
      write_org_file "$UPDATED"

      print_turtle_header "groovy, bond fire time"
      print_tree_start "git.commit.uses block --org @all"
      echo "   ├─ reset: all orgs → blocked"
      echo "   └─ @all: blocked"
    else
      # specific org: set to blocked
      UPDATED=$(echo "$CURRENT" | jq ".orgs[\"$ORG_NAME\"] = \"blocked\"")
      write_org_file "$UPDATED"

      print_turtle_header "groovy, bond fire time"
      print_tree_start "git.commit.uses block --org $ORG_NAME"
      echo "   └─ $ORG_NAME: blocked"
    fi
    ;;

  del)
    if [[ -z "$ORG_NAME" ]]; then
      echo "error: org name required for del"
      echo "usage: git.commit.uses --org <org> del"
      exit 2
    fi

    if [[ "$ORG_NAME" == "@all" ]]; then
      echo "error: cannot delete @all, use allow or block instead"
      exit 2
    fi

    CURRENT=$(read_org_file)
    UPDATED=$(echo "$CURRENT" | jq "del(.orgs[\"$ORG_NAME\"])")
    write_org_file "$UPDATED"

    print_turtle_header "righteous!"
    print_tree_start "git.commit.uses del --org $ORG_NAME"
    echo "   └─ $ORG_NAME: removed (inherits from @all)"
    ;;

  get)
    print_turtle_header "lets check the meter..."
    print_tree_start "git.commit.uses get --org${ORG_NAME:+ $ORG_NAME}"

    if [[ ! -f "$ORG_STATE_FILE" ]]; then
      echo "   └─ no org configs set"
      exit 0
    fi

    CURRENT=$(read_org_file)

    if [[ -n "$ORG_NAME" ]]; then
      # show specific org
      ORG_STATE=$(echo "$CURRENT" | jq -r ".orgs[\"$ORG_NAME\"] // \"unset\"")
      ALL_STATE=$(echo "$CURRENT" | jq -r ".orgs[\"@all\"] // \"unset\"")

      if [[ "$ORG_STATE" != "unset" ]]; then
        echo "   └─ $ORG_NAME: $ORG_STATE"
      elif [[ "$ALL_STATE" != "unset" ]]; then
        echo "   └─ $ORG_NAME: $ALL_STATE (from @all)"
      else
        echo "   └─ $ORG_NAME: unset"
      fi
    else
      # show all orgs
      ORGS=$(echo "$CURRENT" | jq -r '.orgs | to_entries | .[] | "\(.key): \(.value)"')
      if [[ -z "$ORGS" ]]; then
        echo "   └─ no org configs set"
      else
        # count orgs for proper tree formatting
        ORG_COUNT=$(echo "$ORGS" | wc -l)
        CURRENT_IDX=0
        while IFS= read -r line; do
          CURRENT_IDX=$((CURRENT_IDX + 1))
          if [[ $CURRENT_IDX -eq $ORG_COUNT ]]; then
            echo "   └─ $line"
          else
            echo "   ├─ $line"
          fi
        done <<< "$ORGS"
      fi
    fi
    ;;

  *)
    echo "error: unknown command: $COMMAND"
    echo "usage: git.commit.uses --org <org> allow|block|del|get"
    exit 2
    ;;
esac

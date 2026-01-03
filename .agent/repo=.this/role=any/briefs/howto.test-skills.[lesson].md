# howto: test and write skills

## .what

skills are shell scripts that extend claude's capabilities via `npx rhachet run --skill <name>`

## .where

```
src/domain.roles/{role}/skills/
  └── {skill-name}.sh    ← source (edit here)
        ↓
     npm run build
        ↓
dist/domain.roles/{role}/skills/
  └── {skill-name}.sh    ← built (read-only)
        ↓
     npx rhachet roles link
        ↓
.agent/repo={repo}/role={role}/skills/
  └── {skill-name}.sh    ← symlinked (runtime)
```

## .how to test a skill

```sh
# 1. build src → dist
npm run build

# 2. link dist → .agent (creates symlinks)
npx rhachet roles link --role mechanic

# 3. reinitialize hooks and permissions
npx rhachet roles init --role mechanic

# 4. run the skill
npx rhachet run --skill show.gh.test.errors --scope unit
```

shorthand for iteration:
```sh
npm run build && npx rhachet roles link --role mechanic && npx rhachet roles init --role mechanic && npx rhachet run --skill $SKILL_NAME $ARGS
```

## .how to write a skill

### 1. create the script

```sh
touch src/domain.roles/mechanic/skills/my-skill.sh
chmod +x src/domain.roles/mechanic/skills/my-skill.sh
```

### 2. add the header

```bash
#!/usr/bin/env bash
######################################################################
# .what = one line description of the skill
#
# .why  = why this skill exists
#         - benefit 1
#         - benefit 2
#
# usage:
#   my-skill.sh --arg "value"           # example invocation
#   my-skill.sh --flag                  # another example
#
# guarantee:
#   - what this skill guarantees
#   - safety properties
######################################################################
set -euo pipefail
```

### 3. handle rhachet args

rhachet passes `--skill`, `--repo`, `--role` to all skills. ignore them:

```bash
while [[ $# -gt 0 ]]; do
  case $1 in
    # rhachet passes these - ignore them
    --skill|--repo|--role)
      shift 2
      ;;
    --my-arg)
      MY_ARG="$2"
      shift 2
      ;;
    --help|-h)
      echo "usage: ..."
      exit 0
      ;;
    *)
      echo "unknown argument: $1"
      exit 1
      ;;
  esac
done
```

### 4. add permissions (optional)

if the skill should be auto-approved, add to `src/domain.roles/mechanic/inits/init.claude.permissions.jsonc`:

```jsonc
{
  "permissions": {
    "allow": [
      // my-skill - description
      "Bash(npx rhachet run --skill my-skill:*)"
    ]
  }
}
```

### 5. test the skill

```sh
npm run build && npx rhachet roles link --role mechanic && npx rhachet roles init --role mechanic && npx rhachet run --skill my-skill --my-arg "test"
```

## .patterns

### delegate to other skills

```bash
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
exec "$SCRIPT_DIR/other-skill.sh" --flow "$FLOW" "${ARGS[@]}"
```

### safe file operations

use the safe* skills instead of raw commands:
- `npx rhachet run --skill cpsafe` instead of `cp`
- `npx rhachet run --skill mvsafe` instead of `mv`
- `npx rhachet run --skill rmsafe` instead of `rm`
- `npx rhachet run --skill sedreplace` instead of `sed -i`

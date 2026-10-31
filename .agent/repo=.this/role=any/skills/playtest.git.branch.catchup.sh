#!/usr/bin/env bash
######################################################################
# .what = walk the git.branch.catchup critical paths by hand, in a
#         hermetic temp scene, with the real dispatcher from src/
#
# .why  = a verification playtest owes a verbatim runthrough of each
#         critical path; the integration suites assert, but do not
#         show a human the whole session in order
#
# usage:
#   playtest.git.branch.catchup.sh --path clean      # plan, apply, plain push
#   playtest.git.branch.catchup.sh --path conflict   # stop, take, settle, continue
#   playtest.git.branch.catchup.sh --path abort      # stop, take, abort
#   playtest.git.branch.catchup.sh --path lock       # lockfile take, refresh, continue
#   playtest.git.branch.catchup.sh --path main       # refusal on main
#   playtest.git.branch.catchup.sh --path all        # each in turn
#   playtest.git.branch.catchup.sh --path all --from dist   # the built artifact (npm run build first)
#
# guarantee:
#   - every scene sits under $repo/.temp/playtest.git.branch.catchup/
#   - HOME is the scene's own; the org grant and quota are seeded there
#   - each step prints `$ <command>`, its stdout + stderr, and `> exit N`
#   - never touches the repo it runs from, beyond .temp/
#   - exit 0 = walked, 1 = scene build failed, 2 = bad input
######################################################################
set -euo pipefail

# parse args
PATH_NAME=""
FROM="src"
while [[ $# -gt 0 ]]; do
  case "$1" in
    # rhachet passes these; ignore them
    --skill|--repo|--role) shift 2 ;;
    --path) PATH_NAME="${2:-}"; shift 2 ;;
    --from) FROM="${2:-}"; shift 2 ;;
    --help|-h) sed -n '2,23p' "$0"; exit 0 ;;
    *) echo "✋ ConstraintError: unknown arg '$1'" | tee /dev/stderr; exit 2 ;;
  esac
done
case "$PATH_NAME" in
  clean|conflict|abort|lock|main|all) ;;
  *)
    echo "✋ ConstraintError: --path must be one of clean, conflict, abort, lock, main, all (got: '${PATH_NAME:-none}')" | tee /dev/stderr
    exit 2
    ;;
esac

case "$FROM" in
  src|dist) ;;
  *)
    echo "✋ ConstraintError: --from must be src or dist (got: '$FROM')" | tee /dev/stderr
    exit 2
    ;;
esac

REPO_ROOT="$(git rev-parse --show-toplevel)"
DISPATCHER="$REPO_ROOT/$FROM/domain.roles/mechanic/skills/git.branch.catchup/git.branch.catchup.sh"
if [[ ! -f "$DISPATCHER" ]]; then
  echo "✋ ConstraintError: no dispatcher at $FROM/; for dist, run: npm run build" | tee /dev/stderr
  exit 2
fi
SCENES_DIR="$REPO_ROOT/.temp/playtest.git.branch.catchup"
BRANCH="turtle/feat-wave-report"

# quiet fixture git: a fixture failure exits 1 loud
fixture_git() {
  local cwd="$1"; shift
  if ! git -C "$cwd" "$@" >/dev/null 2>"$SCENES_DIR/.fixture.err"; then
    echo "💥 MalfunctionError: fixture git failed: git $*" | tee /dev/stderr
    tee /dev/stderr < "$SCENES_DIR/.fixture.err"
    exit 1
  fi
}

# write files (path, content pairs), then commit them
fixture_commit() {
  local cwd="$1" message="$2"; shift 2
  while [[ $# -gt 0 ]]; do
    mkdir -p "$(dirname "$cwd/$1")"
    printf '%s' "$2" > "$cwd/$1"
    shift 2
  done
  fixture_git "$cwd" add -A
  fixture_git "$cwd" -c user.name="Playtest Surfer" -c user.email="human@test.com" -c commit.gpgsign=false commit -q -m "$message"
}

# build a scene: bare origin on main, the work clone on BRANCH, an upstream clone
gen_scene() {
  local slug="$1"
  SCENE="$SCENES_DIR/$slug.$(date +%s%N)"
  WORK="$SCENE/work"; UPSTREAM="$SCENE/upstream"; SCENE_HOME="$SCENE/home"
  mkdir -p "$SCENE/origin.git" "$SCENE_HOME/.rhachet/storage/repo=ehmpathy/role=mechanic/.meter"
  printf '{ "orgs": { "ehmpathy": "allowed" } }\n' \
    > "$SCENE_HOME/.rhachet/storage/repo=ehmpathy/role=mechanic/.meter/git.commit.uses.org.jsonc"
  fixture_git "$SCENE/origin.git" init -q --bare -b main
  fixture_git "$SCENE" clone -q "$SCENE/origin.git" "$WORK"
  fixture_git "$WORK" config user.name "Playtest Surfer"
  fixture_git "$WORK" config user.email "human@test.com"
  fixture_git "$WORK" config commit.gpgsign false
  fixture_git "$WORK" checkout -q -B main
  fixture_commit "$WORK" "feat(init): seed the wave report" \
    .gitignore $'.meter\n' .agent/keyrack.yml $'org: ehmpathy\n' readme.md $'# wave report\n' \
    src/a.md $'a: base\n' src/b.md $'b: base\n'
  fixture_git "$WORK" push -q -u origin main
  fixture_git "$SCENE" clone -q "$SCENE/origin.git" "$UPSTREAM"
  fixture_git "$UPSTREAM" config user.name "Playtest Surfer"
  fixture_git "$UPSTREAM" config user.email "human@test.com"
  fixture_git "$WORK" checkout -q -b "$BRANCH"
  mkdir -p "$WORK/.meter"
  printf '{ "sponsor": { "name": "Test Human", "email": "human@test.com", "source": "supplied" } }\n' \
    > "$WORK/.meter/git.commit.sponsor.jsonc"
  printf '{ "uses": 4, "push": "allow", "stage": "allow" }\n' > "$WORK/.meter/git.commit.uses.jsonc"
}

# move origin/main via the upstream clone
move_main() {
  local message="$1"; shift
  fixture_git "$UPSTREAM" pull -q origin main
  fixture_commit "$UPSTREAM" "$message" "$@"
  fixture_git "$UPSTREAM" push -q origin main
}

# one visible step: the command, its stdout, how stderr relates, its exit code
step() {
  echo "\$ rhx git.branch.catchup $*"
  local code=0 out_file="$SCENE/.step.out" err_file="$SCENE/.step.err"
  (cd "$WORK" && HOME="$SCENE_HOME" bash "$DISPATCHER" "$@" >"$out_file" 2>"$err_file") || code=$?
  cat "$out_file"
  if [[ ! -s "$err_file" ]]; then echo "> stderr: empty"
  elif cmp -s "$out_file" "$err_file"; then echo "> stderr: the same render"
  else echo "> stderr:"; cat "$err_file"
  fi
  echo "> exit $code"
  echo ""
}

# one visible shell step in the clone (a hand settle, a plain push, a look)
step_sh() {
  echo "\$ $1"
  local code=0
  (cd "$WORK" && HOME="$SCENE_HOME" bash -c "$1" 2>&1) || code=$?
  echo "> exit $code"
  echo ""
}

walk_clean() {
  echo "🌊 path: clean — main moved 2 commits, no overlap"
  echo ""
  gen_scene clean
  fixture_commit "$WORK" "feat(spot): add the spot" src/spot.md $'spot: pipeline\n'
  fixture_git "$WORK" push -q -u origin "$BRANCH"
  move_main "feat(docs): add tide" docs/tide.md $'tide: low\n'
  move_main "feat(docs): add swell" docs/swell.md $'swell: 4ft\n'
  step begin
  step begin --mode apply
  step_sh "git log --format='parents: %p | author: %an <%ae> | %s' -1"
  step_sh "git push origin $BRANCH"
  step begin --mode apply
}

walk_conflict() {
  echo "🌊 path: conflict — both sides edit src/a.md and src/b.md"
  echo ""
  gen_scene conflict
  fixture_commit "$WORK" "feat(src): edit a and b" src/a.md $'a: branch\n' src/b.md $'b: branch\n'
  fixture_git "$WORK" push -q -u origin "$BRANCH"
  move_main "feat(src): edit a and b on main" src/a.md $'a: main\n' src/b.md $'b: main\n'
  step begin --mode apply
  step continue
  step take --whos main src/a.md
  step_sh "printf 'b: main + branch\n' > src/b.md && git add src/b.md"
  step continue
  step_sh "git log --format='parents: %p | author: %an <%ae> | %s' -1 && git log --format='%(trailers:key=Co-authored-by)' -1"
}

walk_abort() {
  echo "🌊 path: abort — back out of a conflicted merge"
  echo ""
  gen_scene abort
  fixture_commit "$WORK" "feat(src): edit a" src/a.md $'a: branch\n'
  fixture_git "$WORK" push -q -u origin "$BRANCH"
  move_main "feat(src): edit a on main" src/a.md $'a: main\n'
  step begin --mode apply
  step take --whos branch src/a.md
  step abort
  step_sh "git status --short && git log --format='%s' -1"
}

walk_lock() {
  echo "🌊 path: lock — main adds dep b, the branch adds devDep b2; only the lockfile conflicts"
  echo ""
  gen_scene lock
  # a pnpm repo on main: file: deps, so the lock needs no registry
  fixture_git "$WORK" checkout -q main
  fixture_commit "$WORK" "feat(deps): add the manifest" \
    pkgs/a/package.json $'{ "name": "a", "version": "1.0.0" }\n' \
    pkgs/b/package.json $'{ "name": "b", "version": "1.0.0" }\n' \
    pkgs/b2/package.json $'{ "name": "b2", "version": "1.0.0" }\n' \
    package.json "$(as_manifest '"a": "file:pkgs/a"' '')"
  (cd "$WORK" && pnpm install --lockfile-only --silent >/dev/null)
  fixture_commit "$WORK" "feat(deps): lock the manifest"
  fixture_git "$WORK" push -q origin main
  fixture_git "$WORK" checkout -q "$BRANCH"
  fixture_git "$WORK" merge -q --ff-only main
  # the branch bumps a devDep
  printf '%s' "$(as_manifest '"a": "file:pkgs/a"' '"b2": "file:pkgs/b2"')" > "$WORK/package.json"
  (cd "$WORK" && pnpm install --lockfile-only --silent >/dev/null)
  fixture_commit "$WORK" "feat(deps): add devDep b2"
  fixture_git "$WORK" push -q -u origin "$BRANCH"
  # main adds a dep
  fixture_git "$UPSTREAM" pull -q origin main
  printf '%s' "$(as_manifest '"a": "file:pkgs/a", "b": "file:pkgs/b"' '')" > "$UPSTREAM/package.json"
  (cd "$UPSTREAM" && pnpm install --lockfile-only --silent >/dev/null)
  fixture_commit "$UPSTREAM" "feat(deps): add dep b"
  fixture_git "$UPSTREAM" push -q origin main
  step begin --mode apply
  step take --whos main pnpm-lock.yaml
  step lock refresh
  step continue
  step_sh "git log --format='parents: %p | %s' -1 && git show HEAD:pnpm-lock.yaml | grep -E '^  (b|b2)@|file:pkgs/(b|b2)$' | sort -u"
}

# a manifest with deps far from devDeps, so each side's edit merges clean
as_manifest() {
  printf '{\n  "name": "wave-report",\n  "version": "1.0.0",\n  "dependencies": { %s },\n  "description": "surf conditions for the crew",\n  "license": "MIT",\n  "private": true,\n  "devDependencies": { %s }\n}\n' "$1" "$2"
}

walk_main() {
  echo "🌊 path: main — the verb refuses to merge into main"
  echo ""
  gen_scene main
  fixture_git "$WORK" checkout -q main
  step begin
  step begin --mode apply
}

mkdir -p "$SCENES_DIR"
case "$PATH_NAME" in
  clean) walk_clean ;;
  conflict) walk_conflict ;;
  abort) walk_abort ;;
  lock) walk_lock ;;
  main) walk_main ;;
  all) walk_clean; walk_conflict; walk_abort; walk_lock; walk_main ;;
esac

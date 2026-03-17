#!/usr/bin/env bash
######################################################################
# .what = shared domain operations for git.repo.get skill
#
# .why  = single source of truth for repo discovery and access
#         separates domain logic from subcommand dispatch
#
# usage:
#   source "$SCRIPT_DIR/git.repo.get.operations.sh"
#   GIT_ROOT=$(get_git_root)
#   REPOS=$(get_all_local_repos)
######################################################################

######################################################################
# get_git_root — return root directory for local git clones
######################################################################
get_git_root() {
  echo "${GIT_REPO_ROOT:-$HOME/git}"
}

######################################################################
# parse_repo_slug — extract scope, org, repo from @scope/org/repo
# returns: scope org repo (space-separated)
######################################################################
parse_repo_slug() {
  local slug="$1"
  local scope="all"
  local org=""
  local repo=""

  # extract @scope if present
  if [[ "$slug" =~ ^@([^/]+)/(.*) ]]; then
    scope="${BASH_REMATCH[1]}"
    slug="${BASH_REMATCH[2]}"
  fi

  # extract org/repo
  if [[ "$slug" =~ ^([^/]+)/(.+)$ ]]; then
    org="${BASH_REMATCH[1]}"
    repo="${BASH_REMATCH[2]}"
  else
    # no org specified, treat as repo pattern in any org
    org="*"
    repo="$slug"
  fi

  echo "$scope $org $repo"
}

######################################################################
# get_all_local_repos — enumerate all local repo clones
# returns: list of org/repo slugs (one per line)
######################################################################
get_all_local_repos() {
  local git_root
  git_root=$(get_git_root)

  if [[ ! -d "$git_root" ]]; then
    return 0
  fi

  # find all .git directories at depth 2 (org/repo/.git)
  find "$git_root" -maxdepth 3 -name ".git" -type d 2>/dev/null | while read -r git_dir; do
    local repo_path="${git_dir%/.git}"
    local rel_path="${repo_path#$git_root/}"
    # only include if it's org/repo format (has exactly one slash)
    if [[ "$rel_path" =~ ^[^/]+/[^/]+$ ]]; then
      echo "$rel_path"
    fi
  done
}

######################################################################
# get_all_cloud_repos — enumerate repos from github org
# args: org name
# returns: list of org/repo slugs (one per line)
######################################################################
get_all_cloud_repos() {
  local org="$1"
  gh repo list "$org" --json nameWithOwner --jq '.[].nameWithOwner' 2>/dev/null || true
}

######################################################################
# filter_by_glob — filter slugs by glob pattern
# stdin: list of slugs
# args: glob pattern
# returns: matched slugs
######################################################################
filter_by_glob() {
  local pattern="$1"
  while IFS= read -r slug; do
    # use bash pattern match
    # shellcheck disable=SC2053
    if [[ "$slug" == $pattern ]]; then
      echo "$slug"
    fi
  done
}

######################################################################
# lookup_repo — find repo (local-first, cloud fallback)
# args: org/repo slug
# returns: "local <path>" or "cloud <url>" or exits with error
######################################################################
lookup_repo() {
  local slug="$1"
  local git_root
  git_root=$(get_git_root)
  local local_path="$git_root/$slug"

  # try local first
  if [[ -d "$local_path/.git" ]]; then
    echo "local $local_path"
    return 0
  fi

  # try cloud
  local url
  url=$(gh repo view "$slug" --json url --jq '.url' 2>/dev/null || true)
  if [[ -n "$url" ]]; then
    echo "cloud $url"
    return 0
  fi

  # not found
  return 1
}

######################################################################
# get_default_branch — get default branch for a repo
# args: repo path (local) or slug (cloud)
# returns: branch name (e.g., "main" or "master")
######################################################################
get_default_branch() {
  local repo_path="$1"
  local is_local="$2"

  if [[ "$is_local" == "local" ]]; then
    # for local repos, check remote HEAD
    cd "$repo_path" || return 1
    git symbolic-ref refs/remotes/origin/HEAD 2>/dev/null | sed 's@^refs/remotes/origin/@@' || echo "main"
  else
    # for cloud repos, use gh api
    local slug="$1"
    gh repo view "$slug" --json defaultBranchRef --jq '.defaultBranchRef.name' 2>/dev/null || echo "main"
  fi
}

######################################################################
# get_files_at_ref — list files at a git ref (local)
# args: repo_path ref
# returns: list of file paths (one per line)
######################################################################
get_files_at_ref() {
  local repo_path="$1"
  local ref="$2"

  cd "$repo_path" || return 1
  git ls-tree -r --name-only "$ref" 2>/dev/null
}

######################################################################
# get_files_at_ref_cloud — list files from github api
# args: owner/repo ref
# returns: list of file paths (one per line)
######################################################################
get_files_at_ref_cloud() {
  local slug="$1"
  local ref="$2"

  gh api "repos/$slug/git/trees/$ref?recursive=1" \
    --jq '.tree[] | select(.type == "blob") | .path' 2>/dev/null
}

######################################################################
# search_lines — search for pattern in files (local)
# args: repo_path ref pattern
# returns: grep-style output with line numbers
######################################################################
search_lines() {
  local repo_path="$1"
  local ref="$2"
  local pattern="$3"

  cd "$repo_path" || return 1
  git grep -E -n "$pattern" "$ref" 2>/dev/null || true
}

######################################################################
# search_lines_cloud — search for pattern via github code search
# args: owner/repo pattern
# returns: list of matched files (limited - no line numbers)
# note: gh search code has rate limits (5/min) and no line context
######################################################################
search_lines_cloud() {
  local slug="$1"
  local pattern="$2"

  # gh search code returns files, not line matches
  # this is a limitation of the github code search api
  gh search code "$pattern" --repo "$slug" --json path --jq '.[].path' 2>/dev/null || true
}

######################################################################
# read_file — read file content at ref (local)
# args: repo_path ref file_path
# returns: file content
######################################################################
read_file() {
  local repo_path="$1"
  local ref="$2"
  local file_path="$3"

  cd "$repo_path" || return 1
  git show "$ref:$file_path" 2>/dev/null
}

######################################################################
# read_file_cloud — read file content from github api
# args: owner/repo ref file_path
# returns: file content (base64 decoded)
######################################################################
read_file_cloud() {
  local slug="$1"
  local ref="$2"
  local file_path="$3"

  # get content and decode base64
  gh api "repos/$slug/contents/$file_path?ref=$ref" \
    --jq '.content' 2>/dev/null | base64 -d 2>/dev/null
}

######################################################################
# cmd_repos — enumerate repos subcommand
######################################################################
cmd_repos() {
  # default to */* if no --repos specified
  if [[ -z "$REPOS_GLOB" ]]; then
    REPOS_GLOB="*/*"
  fi

  # parse the glob pattern
  read -r scope org_pattern repo_pattern <<< "$(parse_repo_slug "$REPOS_GLOB")"

  local repos=()
  local sources=()

  # get local repos if scope allows
  if [[ "$scope" == "all" || "$scope" == "local" ]]; then
    while IFS= read -r slug; do
      [[ -z "$slug" ]] && continue
      # filter by pattern
      if [[ "$slug" == $org_pattern/$repo_pattern ]] || \
         [[ "$org_pattern" == "*" && "${slug#*/}" == $repo_pattern ]]; then
        repos+=("$slug")
        sources+=("local")
      fi
    done < <(get_all_local_repos)
  fi

  # get cloud repos if scope allows (and org is specific)
  if [[ "$scope" == "all" || "$scope" == "cloud" ]]; then
    if [[ "$org_pattern" != "*" ]]; then
      while IFS= read -r slug; do
        [[ -z "$slug" ]] && continue
        # check if not already in local list
        local already_local=false
        for extant in "${repos[@]:-}"; do
          if [[ "$extant" == "$slug" ]]; then
            already_local=true
            break
          fi
        done
        if ! $already_local; then
          # filter by repo pattern
          local repo_name="${slug#*/}"
          if [[ "$repo_name" == $repo_pattern ]]; then
            repos+=("$slug")
            sources+=("cloud")
          fi
        fi
      done < <(get_all_cloud_repos "$org_pattern")
    fi
  fi

  # output
  local count=${#repos[@]}
  if [[ $count -eq 0 ]]; then
    print_turtle_header "crickets..."
    print_tree_start "git.repo.get repos"
    print_tree_branch "repos: $REPOS_GLOB"
    echo "   │"
    print_tree_branch "found: 0 repos" true
  else
    print_turtle_header "far out"
    print_tree_start "git.repo.get repos"
    print_tree_branch "repos: $REPOS_GLOB"
    echo "   │"

    local git_root
    git_root=$(get_git_root)

    # calculate max repo name length for alignment
    local max_len=0
    for slug in "${repos[@]}"; do
      local repo="${slug#*/}"
      local len=${#repo}
      if (( len > max_len )); then
        max_len=$len
      fi
    done

    # group by org - first pass to count repos per org
    declare -A org_counts
    declare -A org_seen
    for slug in "${repos[@]}"; do
      local org="${slug%/*}"
      org_counts[$org]=$(( ${org_counts[$org]:-0} + 1 ))
    done

    # second pass to output with proper tree termination
    local current_org=""
    for i in "${!repos[@]}"; do
      local slug="${repos[$i]}"
      local source="${sources[$i]}"
      local org="${slug%/*}"
      local repo="${slug#*/}"

      if [[ "$org" != "$current_org" ]]; then
        if [[ -n "$current_org" ]]; then
          echo "   │"
        fi
        print_tree_branch "$org"
        current_org="$org"
        org_seen[$org]=0
      fi

      # increment seen count for this org
      org_seen[$org]=$(( ${org_seen[$org]} + 1 ))

      # determine if this is the last repo in this org
      local is_last_in_org=false
      if [[ ${org_seen[$org]} -eq ${org_counts[$org]} ]]; then
        is_last_in_org=true
      fi

      # pad repo name for alignment
      local pad_len=$(( max_len - ${#repo} + 2 ))
      local spaces
      spaces=$(printf '%*s' "$pad_len" '')

      # choose connector based on position
      local connector="├─"
      if $is_last_in_org; then
        connector="└─"
      fi

      if [[ "$source" == "local" ]]; then
        # display path with ~ instead of $HOME for readability
        local full_path="$git_root/$slug"
        local display_path
        display_path=$(echo "$full_path" | sed "s|^$HOME|~|")
        echo "   │  ${connector} ${repo}${spaces}${display_path} (local)"
      else
        echo "   │  ${connector} ${repo}${spaces}github.com/$slug (cloud)"
      fi
    done

    echo "   │"
    print_tree_branch "found: $count repos" true
  fi
}

######################################################################
# cmd_files_multi — list files across multiple repos
######################################################################
cmd_files_multi() {
  # parse the glob pattern
  read -r scope org_pattern repo_pattern <<< "$(parse_repo_slug "$REPOS_GLOB")"

  local repos=()
  local sources=()

  # get matched repos (same logic as cmd_repos)
  if [[ "$scope" == "all" || "$scope" == "local" ]]; then
    while IFS= read -r slug; do
      [[ -z "$slug" ]] && continue
      if [[ "$slug" == $org_pattern/$repo_pattern ]] || \
         [[ "$org_pattern" == "*" && "${slug#*/}" == $repo_pattern ]]; then
        repos+=("$slug")
        sources+=("local")
      fi
    done < <(get_all_local_repos)
  fi

  if [[ ${#repos[@]} -eq 0 ]]; then
    print_turtle_header "crickets..."
    print_tree_start "git.repo.get files"
    print_tree_branch "repos: $REPOS_GLOB"
    if [[ -n "$WORDS_PATTERN" ]]; then
      print_tree_branch "words: $WORDS_PATTERN"
    fi
    if [[ -n "$PATHS_GLOB" ]]; then
      print_tree_branch "paths: $PATHS_GLOB"
    fi
    echo "   │"
    print_tree_branch "found: 0 files" true
    return
  fi

  # search each repo for files
  local all_results=()
  local total_files=0
  local repos_with_files=0

  for i in "${!repos[@]}"; do
    local slug="${repos[$i]}"
    local source="${sources[$i]}"
    local git_root
    git_root=$(get_git_root)
    local location="$git_root/$slug"

    # get ref
    local ref="$REF"
    if [[ -z "$ref" ]]; then
      ref="origin/$(get_default_branch "$location" "local")"
    fi

    # get files
    local files
    files=$(get_files_at_ref "$location" "$ref" 2>/dev/null) || continue

    # filter by paths if specified
    if [[ -n "$PATHS_GLOB" ]]; then
      files=$(echo "$files" | while IFS= read -r f; do
        # shellcheck disable=SC2053
        if [[ "$f" == $PATHS_GLOB ]]; then
          echo "$f"
        fi
      done)
    fi

    # filter by words if specified
    if [[ -n "$WORDS_PATTERN" ]]; then
      local found_files
      found_files=$(cd "$location" && git grep -E -l "$WORDS_PATTERN" "$ref" -- ${files:-} 2>/dev/null | sed "s|^$ref:||" || true)
      files="$found_files"
    fi

    # count and store results
    if [[ -n "$files" ]]; then
      local count
      count=$(echo "$files" | wc -l)
      total_files=$((total_files + count))
      repos_with_files=$((repos_with_files + 1))
      all_results+=("$slug|$source|$files")
    fi
  done

  # output
  if [[ $total_files -eq 0 ]]; then
    print_turtle_header "crickets..."
    print_tree_start "git.repo.get files"
    print_tree_branch "repos: $REPOS_GLOB"
    if [[ -n "$WORDS_PATTERN" ]]; then
      print_tree_branch "words: $WORDS_PATTERN"
    fi
    if [[ -n "$PATHS_GLOB" ]]; then
      print_tree_branch "paths: $PATHS_GLOB"
    fi
    echo "   │"
    print_tree_branch "found: 0 files" true
  else
    print_turtle_header "far out"
    print_tree_start "git.repo.get files"
    print_tree_branch "repos: $REPOS_GLOB"
    if [[ -n "$WORDS_PATTERN" ]]; then
      print_tree_branch "words: $WORDS_PATTERN"
    fi
    if [[ -n "$PATHS_GLOB" ]]; then
      print_tree_branch "paths: $PATHS_GLOB"
    fi
    echo "   │"

    # output results grouped by repo
    local num_results=${#all_results[@]}
    local repo_idx=0
    for result in "${all_results[@]}"; do
      repo_idx=$((repo_idx + 1))
      local is_last_repo=$([[ $repo_idx -eq $num_results ]] && echo true || echo false)

      local slug="${result%%|*}"
      local rest="${result#*|}"
      local source="${rest%%|*}"
      local files="${rest#*|}"

      local repo_connector="├─"
      local file_prefix="│  "
      if $is_last_repo; then
        repo_connector="├─"
        file_prefix="│  "
      fi

      echo "   ${repo_connector} $slug ($source)"

      # output files with proper termination
      local file_count
      file_count=$(echo "$files" | wc -l)
      local shown_count=$((file_count > 10 ? 10 : file_count))
      local file_idx=0

      echo "$files" | head -10 | while IFS= read -r f; do
        file_idx=$((file_idx + 1))
        local is_last_file=$([[ $file_idx -eq $shown_count && $file_count -le 10 ]] && echo true || echo false)
        local file_connector="├─"
        if $is_last_file; then
          file_connector="└─"
        fi
        echo "   ${file_prefix}${file_connector} $f"
      done

      if [[ $file_count -gt 10 ]]; then
        echo "   ${file_prefix}└─ ... $((file_count - 10)) more"
      fi
      echo "   │"
    done

    print_tree_branch "found: $total_files files in $repos_with_files repos" true
  fi
}

######################################################################
# cmd_files — list files subcommand
######################################################################
cmd_files() {
  # default to */* if --words specified but no --in or --repos
  if [[ -z "$REPO_SLUG" && -z "$REPOS_GLOB" && -n "$WORDS_PATTERN" ]]; then
    REPOS_GLOB="*/*"
  fi

  # multi-repo mode
  if [[ -n "$REPOS_GLOB" ]]; then
    cmd_files_multi
    return
  fi

  # single-repo mode requires --in
  if [[ -z "$REPO_SLUG" ]]; then
    print_turtle_header "bummer dude"
    print_tree_start "git.repo.get files"
    print_tree_error "--in flag is required"
    exit 2
  fi

  # lookup repo
  local lookup_result
  if ! lookup_result=$(lookup_repo "$REPO_SLUG"); then
    print_turtle_header "bummer dude"
    print_tree_start "git.repo.get files"
    print_tree_branch "repo: $REPO_SLUG"
    print_tree_error "repo not found"
    exit 2
  fi

  read -r source location <<< "$lookup_result"

  # determine ref
  local ref="$REF"
  if [[ -z "$ref" ]]; then
    if [[ "$source" == "local" ]]; then
      ref="origin/$(get_default_branch "$location" "local")"
    else
      ref="$(get_default_branch "$REPO_SLUG" "cloud")"
    fi
  fi

  # get files
  local files
  if [[ "$source" == "local" ]]; then
    files=$(get_files_at_ref "$location" "$ref")
  else
    files=$(get_files_at_ref_cloud "$REPO_SLUG" "$ref")
  fi

  # filter by paths glob if specified
  if [[ -n "$PATHS_GLOB" ]]; then
    files=$(echo "$files" | while IFS= read -r f; do
      # shellcheck disable=SC2053
      if [[ "$f" == $PATHS_GLOB ]]; then
        echo "$f"
      fi
    done)
  fi

  # filter by words if specified (content search)
  if [[ -n "$WORDS_PATTERN" ]]; then
    local found_files
    if [[ "$source" == "local" ]]; then
      found_files=$(cd "$location" && git grep -E -l "$WORDS_PATTERN" "$ref" -- ${files:-} 2>/dev/null | sed "s|^$ref:||" || true)
    else
      # cloud: use search_lines_cloud for files with content
      found_files=$(search_lines_cloud "$REPO_SLUG" "$WORDS_PATTERN")
      # intersect with path-filtered files if paths glob was specified
      if [[ -n "$PATHS_GLOB" && -n "$files" ]]; then
        found_files=$(comm -12 <(echo "$files" | sort) <(echo "$found_files" | sort) 2>/dev/null || true)
      fi
    fi
    files="$found_files"
  fi

  # count files
  local count=0
  if [[ -n "$files" ]]; then
    count=$(echo "$files" | wc -l)
  fi

  # output
  if [[ $count -eq 0 ]]; then
    print_turtle_header "crickets..."
    print_tree_start "git.repo.get files"
    print_tree_branch "repo: $REPO_SLUG ($source)"
    print_tree_branch "ref: $ref"
    if [[ -n "$PATHS_GLOB" ]]; then
      print_tree_branch "paths: $PATHS_GLOB"
    fi
    if [[ -n "$WORDS_PATTERN" ]]; then
      print_tree_branch "words: $WORDS_PATTERN"
    fi
    echo "   │"
    print_tree_branch "found: 0 files" true
  else
    print_turtle_header "far out"
    print_tree_start "git.repo.get files"
    print_tree_branch "repo: $REPO_SLUG ($source)"
    print_tree_branch "ref: $ref"
    if [[ -n "$PATHS_GLOB" ]]; then
      print_tree_branch "paths: $PATHS_GLOB"
    fi
    if [[ -n "$WORDS_PATTERN" ]]; then
      print_tree_branch "words: $WORDS_PATTERN"
    fi
    echo "   │"

    # show files (simple list for now)
    echo "$files" | head -20 | while IFS= read -r f; do
      echo "   ├─ $f"
    done

    if [[ $count -gt 20 ]]; then
      echo "   ├─ ... $((count - 20)) more"
    fi

    echo "   │"
    print_tree_branch "found: $count files" true
  fi
}

######################################################################
# cmd_lines_multi — search lines across multiple repos
######################################################################
cmd_lines_multi() {
  # multi-repo search requires --words
  if [[ -z "$WORDS_PATTERN" ]]; then
    print_turtle_header "bummer dude"
    print_tree_start "git.repo.get lines"
    print_tree_branch "repos: $REPOS_GLOB"
    print_tree_error "--words is required for multi-repo search"
    exit 2
  fi

  # parse the glob pattern
  read -r scope org_pattern repo_pattern <<< "$(parse_repo_slug "$REPOS_GLOB")"

  local repos=()
  local sources=()

  # get matched repos
  if [[ "$scope" == "all" || "$scope" == "local" ]]; then
    while IFS= read -r slug; do
      [[ -z "$slug" ]] && continue
      if [[ "$slug" == $org_pattern/$repo_pattern ]] || \
         [[ "$org_pattern" == "*" && "${slug#*/}" == $repo_pattern ]]; then
        repos+=("$slug")
        sources+=("local")
      fi
    done < <(get_all_local_repos)
  fi

  if [[ ${#repos[@]} -eq 0 ]]; then
    print_turtle_header "crickets..."
    print_tree_start "git.repo.get lines"
    print_tree_branch "repos: $REPOS_GLOB"
    print_tree_branch "words: $WORDS_PATTERN"
    if [[ -n "$PATHS_GLOB" ]]; then
      print_tree_branch "paths: $PATHS_GLOB"
    fi
    echo "   │"
    print_tree_branch "found: 0 matches" true
    return
  fi

  # search each repo
  local all_results=()
  local total_matches=0
  local repos_with_matches=0

  for i in "${!repos[@]}"; do
    local slug="${repos[$i]}"
    local source="${sources[$i]}"
    local git_root
    git_root=$(get_git_root)
    local location="$git_root/$slug"

    # get ref
    local ref="$REF"
    if [[ -z "$ref" ]]; then
      ref="origin/$(get_default_branch "$location" "local")"
    fi

    # search
    cd "$location" || continue
    local grep_args=(-E -n "$WORDS_PATTERN" "$ref")
    if [[ -n "$PATHS_GLOB" ]]; then
      grep_args+=(-- "$PATHS_GLOB")
    fi
    local matches
    matches=$(git grep "${grep_args[@]}" 2>/dev/null || true)

    if [[ -n "$matches" ]]; then
      local count
      count=$(echo "$matches" | wc -l)
      total_matches=$((total_matches + count))
      repos_with_matches=$((repos_with_matches + 1))
      all_results+=("$slug|$source|$ref|$matches")
    fi
  done

  # output
  if [[ $total_matches -eq 0 ]]; then
    print_turtle_header "crickets..."
    print_tree_start "git.repo.get lines"
    print_tree_branch "repos: $REPOS_GLOB"
    print_tree_branch "words: $WORDS_PATTERN"
    if [[ -n "$PATHS_GLOB" ]]; then
      print_tree_branch "paths: $PATHS_GLOB"
    fi
    echo "   │"
    print_tree_branch "found: 0 matches" true
  else
    print_turtle_header "far out"
    print_tree_start "git.repo.get lines"
    print_tree_branch "repos: $REPOS_GLOB"
    print_tree_branch "words: $WORDS_PATTERN"
    if [[ -n "$PATHS_GLOB" ]]; then
      print_tree_branch "paths: $PATHS_GLOB"
    fi
    echo "   │"

    # output results grouped by repo
    local num_results=${#all_results[@]}
    local repo_idx=0
    for result in "${all_results[@]}"; do
      repo_idx=$((repo_idx + 1))

      local slug="${result%%|*}"
      local rest="${result#*|}"
      local source="${rest%%|*}"
      rest="${rest#*|}"
      local ref="${rest%%|*}"
      local matches="${rest#*|}"

      local repo_count
      repo_count=$(echo "$matches" | wc -l)
      echo "   ├─ $slug ($source) — $repo_count matches"

      # collect unique files and their line counts
      local files_in_repo
      files_in_repo=$(echo "$matches" | head -20 | while IFS= read -r line; do
        local file_and_line="${line#$ref:}"
        echo "${file_and_line%%:*}"
      done | uniq)

      local num_files
      num_files=$(echo "$files_in_repo" | wc -l)
      local file_idx=0

      # group by file within repo
      local current_file=""
      echo "$matches" | head -20 | while IFS= read -r line; do
        local file_and_line="${line#$ref:}"
        local file="${file_and_line%%:*}"
        local rest="${file_and_line#*:}"
        local linenum="${rest%%:*}"
        local content="${rest#*:}"

        if [[ "$file" != "$current_file" ]]; then
          file_idx=$((file_idx + 1))
          local is_last_file=$([[ $file_idx -eq $num_files && $repo_count -le 20 ]] && echo true || echo false)
          local file_connector="├─"
          if $is_last_file; then
            file_connector="└─"
          fi
          if [[ -n "$current_file" ]]; then
            echo "   │  │"
          fi
          echo "   │  ${file_connector} $file"
          current_file="$file"
        fi
        printf "   │  │  > %4d: %s\n" "$linenum" "$content"
      done

      if [[ $repo_count -gt 20 ]]; then
        echo "   │  │"
        echo "   │  └─ ... $((repo_count - 20)) more matches"
      fi
      echo "   │"
    done

    print_tree_branch "found: $total_matches matches in $repos_with_matches repos" true
  fi
}

######################################################################
# cmd_lines — search or read lines subcommand
######################################################################
cmd_lines() {
  # default to */* if --words specified but no --in or --repos
  if [[ -z "$REPO_SLUG" && -z "$REPOS_GLOB" && -n "$WORDS_PATTERN" ]]; then
    REPOS_GLOB="*/*"
  fi

  # multi-repo mode
  if [[ -n "$REPOS_GLOB" ]]; then
    cmd_lines_multi
    return
  fi

  # single-repo mode requires --in
  if [[ -z "$REPO_SLUG" ]]; then
    print_turtle_header "bummer dude"
    print_tree_start "git.repo.get lines"
    print_tree_error "--in or --repos flag is required"
    exit 2
  fi

  # lookup repo
  local lookup_result
  if ! lookup_result=$(lookup_repo "$REPO_SLUG"); then
    print_turtle_header "bummer dude"
    print_tree_start "git.repo.get lines"
    print_tree_branch "repo: $REPO_SLUG"
    print_tree_error "repo not found"
    echo ""
    echo "   try broader search:"
    local org="${REPO_SLUG%/*}"
    echo "     \$ rhx git.repo.get lines --repos '$org/*' --words 'pattern'"
    exit 2
  fi

  read -r source location <<< "$lookup_result"

  # determine ref
  local ref="$REF"
  if [[ -z "$ref" ]]; then
    if [[ "$source" == "local" ]]; then
      ref="origin/$(get_default_branch "$location" "local")"
    else
      ref="$(get_default_branch "$REPO_SLUG" "cloud")"
    fi
  fi

  # search mode vs read mode
  if [[ -n "$WORDS_PATTERN" ]]; then
    # search mode
    local matches

    if [[ "$source" == "local" ]]; then
      cd "$location" || exit 2

      # build git grep command
      local grep_args=(-E -n "$WORDS_PATTERN" "$ref")
      if [[ -n "$PATHS_GLOB" ]]; then
        grep_args+=(-- "$PATHS_GLOB")
      fi

      matches=$(git grep "${grep_args[@]}" 2>/dev/null || true)
    else
      # cloud search: limited to file list (no line numbers from github api)
      # get files that match, then show content for each
      local matched_files
      matched_files=$(search_lines_cloud "$REPO_SLUG" "$WORDS_PATTERN")

      # filter by paths glob if specified
      if [[ -n "$PATHS_GLOB" && -n "$matched_files" ]]; then
        matched_files=$(echo "$matched_files" | while IFS= read -r f; do
          # shellcheck disable=SC2053
          if [[ "$f" == $PATHS_GLOB ]]; then
            echo "$f"
          fi
        done)
      fi

      # for each file, fetch content and grep locally for line numbers
      matches=""
      while IFS= read -r file; do
        [[ -z "$file" ]] && continue
        local content
        content=$(read_file_cloud "$REPO_SLUG" "$ref" "$file" 2>/dev/null || true)
        if [[ -n "$content" ]]; then
          # grep content for line numbers
          local file_matches
          file_matches=$(echo "$content" | grep -E -n "$WORDS_PATTERN" 2>/dev/null | while IFS=: read -r linenum line_content; do
            echo "$ref:$file:$linenum:$line_content"
          done || true)
          if [[ -n "$file_matches" ]]; then
            if [[ -n "$matches" ]]; then
              matches="$matches"$'\n'"$file_matches"
            else
              matches="$file_matches"
            fi
          fi
        fi
      done <<< "$matched_files"
    fi

    if [[ -z "$matches" ]]; then
      print_turtle_header "crickets..."
      print_tree_start "git.repo.get lines"
      print_tree_branch "repo: $REPO_SLUG ($source)"
      print_tree_branch "ref: $ref"
      print_tree_branch "words: $WORDS_PATTERN"
      if [[ -n "$PATHS_GLOB" ]]; then
        print_tree_branch "paths: $PATHS_GLOB"
      fi
      echo "   │"
      print_tree_branch "found: 0 matches" true
    else
      local match_count
      match_count=$(echo "$matches" | wc -l)

      print_turtle_header "far out"
      print_tree_start "git.repo.get lines"
      print_tree_branch "repo: $REPO_SLUG ($source)"
      print_tree_branch "ref: $ref"
      print_tree_branch "words: $WORDS_PATTERN"
      print_tree_branch "radius: $RADIUS"
      if [[ -n "$PATHS_GLOB" ]]; then
        print_tree_branch "paths: $PATHS_GLOB"
      fi
      echo "   │"

      # group by file and show with context
      local current_file=""
      echo "$matches" | while IFS= read -r line; do
        # parse ref:file:linenum:content
        local file_and_line="${line#$ref:}"
        local file="${file_and_line%%:*}"
        local rest="${file_and_line#*:}"
        local linenum="${rest%%:*}"
        local content="${rest#*:}"

        if [[ "$file" != "$current_file" ]]; then
          if [[ -n "$current_file" ]]; then
            echo "   │  └─"
            echo "   │"
          fi
          echo "   ├─ $file"
          echo "   │  ├─"
          current_file="$file"
        fi

        # show match with > prefix
        printf "   │  │ > %4d: %s\n" "$linenum" "$content"
      done

      echo "   │  └─"
      echo "   │"
      print_tree_branch "found: $match_count matches" true
    fi
  else
    # read mode - need a specific file
    if [[ -z "$PATHS_GLOB" ]]; then
      print_turtle_header "bummer dude"
      print_tree_start "git.repo.get lines"
      print_tree_branch "repo: $REPO_SLUG ($source)"
      print_tree_error "--paths is required for read mode (no --words)"
      exit 2
    fi

    # read the file
    local content
    if [[ "$source" == "local" ]]; then
      cd "$location" || exit 2
      content=$(git show "$ref:$PATHS_GLOB" 2>/dev/null) || true
    else
      content=$(read_file_cloud "$REPO_SLUG" "$ref" "$PATHS_GLOB" 2>/dev/null) || true
    fi

    if [[ -z "$content" ]]; then
      print_turtle_header "crickets..."
      print_tree_start "git.repo.get lines"
      print_tree_branch "repo: $REPO_SLUG ($source)"
      print_tree_branch "ref: $ref"
      print_tree_branch "paths: $PATHS_GLOB"
      echo "   │"
      print_tree_branch "found: 0 files" true
      exit 0
    fi

    local line_count
    line_count=$(echo "$content" | wc -l)

    print_turtle_header "far out"
    print_tree_start "git.repo.get lines"
    print_tree_branch "repo: $REPO_SLUG ($source)"
    print_tree_branch "paths: $PATHS_GLOB"
    echo "   │"
    echo "   ├─ $PATHS_GLOB ($line_count lines)"
    echo "   │  ├─"

    # show content with line numbers
    local linenum=1
    echo "$content" | while IFS= read -r line; do
      printf "   │  │  %4d: %s\n" "$linenum" "$line"
      linenum=$((linenum + 1))
    done

    echo "   │  └─"
    echo "   │"
    print_tree_branch "found: 1 file" true
  fi
}

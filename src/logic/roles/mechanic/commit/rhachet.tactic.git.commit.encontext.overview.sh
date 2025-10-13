# Set the current working directory as the root for operations
cd "$(pwd)"

# Initialize an empty string to accumulate context information
context_info=""

# Get the current branch name and append to context_info with a nature emoji
current_branch=$(git branch --show-current)
context_info+="🌿 Branch: $current_branch\n\n"

# Get the last 21 commit messages and append to context_info with a nature emoji
commit_messages=$(git log -21 --pretty=format:"%s")
context_info+="🌳 Last 21 commit messages:\n$commit_messages\n"

# Output the gathered context for writing a git commit message
echo -e "$context_info"

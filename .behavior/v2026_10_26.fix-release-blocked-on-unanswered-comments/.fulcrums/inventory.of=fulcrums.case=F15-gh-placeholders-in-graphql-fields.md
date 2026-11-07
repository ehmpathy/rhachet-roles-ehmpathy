# F15 — the release thread read names its repo via gh placeholders

## the fork
- **a.** keep `-F owner='{owner}' -F name='{repo}'` in the release read (`git.release.operations.sh:919`); gh fills both from the cwd repo
- **b.** pass an explicit owner and name, as `git.pull.comment get` does (`git.pull.comment.operations.sh:578-580`); costs one more gh read (`gh repo view`) and one more mock key per suite

## taken: a, and why at the time
gh fills `{owner}`, `{repo}`, `{branch}` in `-F` field values as well as in the endpoint: `gh api` help, flag `-F`, "placeholder values {owner}, {repo}, and {branch} get populated with values from the repository of the current directory" (cli/cli `pkg/cmd/api/api.go:116`). the two rest reads beside it (`:911-912`) already lean on the same fill in their endpoints, and git.release runs in the repo it releases. `--paginate` over `reviewThreads.pageInfo` is the same query the released `get` verb paginates (`git.pull.comment.operations.sh:580`), so the page walk is not new.

## rework: clean
one line, plus one mock key; no caller builds on it.

## confidence: 85%, and why it is low
no test runs against real gh; the claim rests on gh's documented contract, not a measured call. a by-hand run against a real pr at release closes it.

## where
`git.release.operations.sh:919`

## verdict
open

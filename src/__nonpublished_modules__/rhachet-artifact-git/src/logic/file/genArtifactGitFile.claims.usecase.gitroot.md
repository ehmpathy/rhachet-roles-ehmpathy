{
  "claims": {
    "lessons": [
      "`@gitroot` is a **literal alias** representing the root of the nearest Git repository from current working directory.",
      "Virtual paths like `@gitroot/.rhachet` must be resolved before any file system or artifact operations.",
      "The resolved path is `path.join(gitRoot, suffix)` where `suffix` is the rest of the virtual path.",
      "Resolution fails **explicitly** with `BadRequestError` if no Git root is found.",
      "Only the alias `@gitroot` is supported (no generic URI schemes or alias expansion)."
    ],
    "assumptions": [
      "The current process is expected to be invoked from within a Git-controlled workspace.",
      "The Git root is discoverable by walking up from `process.cwd()` using `.git` as the marker.",
      "`@gitroot/...` is passed as a file-like URI and should be rewritten to a resolved absolute path.",
      "All resolution happens synchronously or at the top of an artifact access flow (e.g. in `genArtifactGitFile`)."
    ],
    "questions": [
      "Should multiple layers of resolution be supported (e.g. `@gitroot/@someAlias`)? (→ No)",
      "Should we cache git root lookups per process? (→ Probably yes, for perf)"
    ]
  },
  "cases": {
    "use": [
      {
        "who": "a test author",
        "when": "declaring a GitFile artifact inside a repo-scoped config folder",
        "what": "uses `@gitroot/.rhachet/config.json` to make path portable"
      },
      {
        "who": "a CLI user",
        "when": "running a command that takes a file or artifact path",
        "what": "uses `@gitroot/mydir/file.txt` as a shorthand for project-relative addressing"
      }
    ],
    "test": [
      {
        "form": "positive",
        "given": "cwd inside a git repo and input = '@gitroot/.rhachet'",
        "when": "resolving the path",
        "then": "returns '<repo-root>/.rhachet'",
        "because": "the alias @gitroot should resolve relative to git root"
      },
      {
        "form": "positive",
        "given": "cwd inside a deep subdir of git repo and input = '@gitroot/dir/a.txt'",
        "when": "resolving the path",
        "then": "returns '<repo-root>/dir/a.txt'",
        "because": "resolution always begins from discovered root"
      },
      {
        "form": "negative",
        "given": "cwd outside of any git repo and input = '@gitroot/anywhere'",
        "when": "resolving the path",
        "then": "throws BadRequestError",
        "because": "resolution requires a valid git root"
      },
      {
        "form": "negative",
        "given": "input = '@someother/thing'",
        "when": "resolving the path",
        "then": "throws BadRequestError",
        "because": "only '@gitroot' is a supported alias"
      }
    ]
  }
}

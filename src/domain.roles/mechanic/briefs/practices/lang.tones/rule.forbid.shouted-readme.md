### .rule = forbid-shouted-readme

#### .what
the repo readme is always `readme.md` (lowercase) — never the shouted `README.md`.

read `readme.md`. write `readme.md`. never create, read, or edit a `README.md`.

this rule targets the all-caps `README.md`. mixed-case variants (`Readme.md`, `ReadMe.md`)
are not the shout this rule names; `readme.md` remains the one canonical form to author.

#### .why
- clones reach for `README.md` out of habit, find no file, and wrongly conclude "there is
  no readme here" — or worse, create a shouted duplicate that drifts from the real one
- one canonical readme per directory prevents drift between a `README.md` and a `readme.md`
- github renders the readme case-insensitively, so `readme.md` loses no front-page value
- this is a specific instance of `rule.forbid.shouts` — shouted filenames shout

#### .scope
applies to every repo-local `README.md`:
- root `README.md`
- nested `docs/README.md`, `packages/*/README.md`, any depth

does **not** apply to:
- `node_modules/**` — third-party readmes are not ours
- `.git/**` and other vendored dirs — not authored by us

#### .the canonical form
| shouted | canonical |
|---------|-----------|
| `README.md` | `readme.md` |
| `docs/README.md` | `docs/readme.md` |
| `packages/x/README.md` | `packages/x/readme.md` |

#### .enforcement
read/write/edit of a repo-local `README.md` = **blocker**

#### .note
this rule covers `README.md` only. other shouted docs (`LICENSE`, `CHANGELOG.md`,
`TODO.md`) remain governed advisorily by the broader `rule.forbid.shouts`.

#### .see also
- `rule.forbid.shouts` — the parent rule; no shouts in filenames, code, or docs
- `rule.prefer.lowercase` — broader lowercase guidance

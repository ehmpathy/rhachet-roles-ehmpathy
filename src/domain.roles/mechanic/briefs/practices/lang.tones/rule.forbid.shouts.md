### .rule = forbid-capital-acronyms

#### .what
acronyms must be lowercase — no shouts

#### .scope
- code: variable names, function names, type names, comments
- files: filenames, directory names, paths
- docs: markdown, briefs, prompts
- logs: error messages, debug output
- comms: commit messages, PR descriptions

#### .why
- all-caps acronyms **shout** — they demand attention they did not earn
- lowercase reads calmer and integrates better with surrounding text
- we already know `jwt` is a distinct term — capitalization adds no information
- mixed-case acronyms create ugly camelCase collisions (`getJWTToken` vs `getJwtToken`)
- consistency with `rule.prefer.lowercase` — if sentences don't shout, neither should terms

#### .enforcement
capital acronyms = **BLOCKER**

#### .alternatives

| 👎 shouts | 👍 chill |
|-------------|----------|
| `JWT` | `jwt` |
| `API` | `api` |
| `CLI` | `cli` |
| `JSON` | `json` |
| `HTML` | `html` |
| `HTTP` | `http` |
| `URL` | `url` |
| `UUID` | `uuid` |
| `SQL` | `sql` |
| `CSS` | `css` |
| `XML` | `xml` |
| `REST` | `rest` |
| `YAML` | `yaml` |
| `AWS` | `aws` |
| `GCP` | `gcp` |
| `SDK` | `sdk` |
| `IDE` | `ide` |
| `CI` | `ci` |
| `CD` | `cd` |

#### .examples

**👎 bad**
```ts
const parseJWT = (token: string) => {};     // shouts
const API_URL = 'https://...';               // double shout
interface JSONResponse { }                   // loud type name
// validate the JWT token via REST API       // comment shouts
```

**👍 good**
```ts
const parseJwt = (token: string) => {};      // calm
const apiUrl = 'https://...';                 // peaceful
interface JsonResponse { }                    // quiet type name
// validate the jwt token via rest api        // chill comment
```

#### .note: filepaths
filenames and directories follow the same rule — no shouts in the filesystem:

| 👎 shouts | 👍 chill |
|-------------|----------|
| `README.md` | `readme.md` |
| `CHANGELOG.md` | `changelog.md` |
| `LICENSE` | `license` |
| `TODO.md` | `todo.md` |
| `API.md` | `api.md` |
| `CLI.md` | `cli.md` |
| `src/API/` | `src/api/` |
| `docs/JSON/` | `docs/json/` |

#### .note: camelCase integration
when acronyms appear in camelCase contexts, treat them as regular words:
- `getJwtToken` not `getJWTToken`
- `parseJsonResponse` not `parseJSONResponse`
- `httpClient` not `HTTPClient`

#### .see also
- `rule.prefer.lowercase` — broader lowercase guidance
- `rule.require.ubiqlang` — consistent terminology

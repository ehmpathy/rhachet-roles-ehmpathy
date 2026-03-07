# rule: prefer .agent/repo=.this for internal briefs

## .what

unless explicitly told to add a brief to `src/domain.roles/`, put briefs in `.agent/repo=.this/role=any/briefs/`.

## .why

| location | audience | published |
|----------|----------|-----------|
| `src/domain.roles/` | public | yes - npm package |
| `.agent/repo=.this/` | internal | no - repo only |

- `src/domain.roles/` briefs are published via npm to all users of rhachet-roles-ehmpathy
- `.agent/repo=.this/` briefs are only visible within this repo
- internal lessons, patterns, and repo-specific rules belong in `.agent/repo=.this/`
- public best practices for all ehmpathy repos belong in `src/domain.roles/`

## .examples

### internal (use .agent/repo=.this/)
- repo-specific test patterns
- local development tips
- internal toolchain lessons
- debug techniques for this repo

### public (use src/domain.roles/)
- universal code standards
- domain-driven design rules
- language and name conventions
- patterns all ehmpathy repos should follow

## .default

when in doubt, use `.agent/repo=.this/role=any/briefs/` - it can always be promoted to public later.

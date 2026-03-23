# howto: check role token costs

## .what

use `npx rhachet roles cost` to see token usage per file in a role.

## .why

- identify which files consume the most tokens
- make informed decisions about say vs ref in boot.yml
- skills show `[docs only]` — boot extracts just headers, not implementation

## .how

```sh
npx rhachet roles cost --repo ehmpathy --role mechanic
```

## .output

```
.agent/repo=ehmpathy/role=mechanic
├── briefs
│   └── practices
│       └── code.prod
│           └── rule.require.pinned-versions.md  39 tokens ($0.000)
├── skills
│   └── git.release
│       └── git.release.sh  458 tokens ($0.001) [docs only]
...

Summary:
  ├── files = 181
  ├── chars = 282,515
  └── tokens ≈ 70,700 ($0.21 at $3/mil)

Top 10 Token Sources:
  ├── 4,752 tokens (6.7%) init.claude.permissions.jsonc
  ├── 3,935 tokens (5.6%) rule.prefer.declastruct.[demo].md
  ...
```

## .key insight

`[docs only]` means boot.yml extracts just the doc header from skills, not the full implementation. a 50KB skill might only cost 458 tokens.

## .when to use

- before/after you add items to boot.yml say section
- to optimize token budget
- to decide say vs ref for briefs

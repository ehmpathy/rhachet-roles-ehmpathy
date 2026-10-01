# howto: use git.commit.set

## .what

`git.commit.set` creates commits as seaturtle[bot] with human co-author credit.

## .stdin pattern

message is piped via stdin to avoid shell escape issues.

### printf approach

```bash
printf 'fix(api): validate input\n\n- added schema validation\n- updated tests' | npx rhachet run --skill git.commit.set -m @stdin --mode apply
```

### heredoc approach

```bash
npx rhachet run --skill git.commit.set -m @stdin --mode apply <<'EOF'
fix(api): validate input

- added schema validation
- updated tests
EOF
```

## .message format

```
<header: type(scope): description>
<blank line>
<body: bullet points>
```

- line 1 = header (required)
- line 2 = blank (required)
- lines 3+ = body (required)

## .options

| option | description |
|--------|-------------|
| `--mode plan` | preview commit (default) |
| `--mode apply` | execute commit |
| `--push` | push + findsert pr after commit |
| `--unstaged ignore` | commit staged only, ignore unstaged |
| `--unstaged include` | stage all changes before commit |

## .examples

```bash
# plan mode (preview)
printf 'fix(api): validate\n\n- added checks' | npx rhachet run --skill git.commit.set -m @stdin

# apply mode
printf 'fix(api): validate\n\n- added checks' | npx rhachet run --skill git.commit.set -m @stdin --mode apply

# apply + push
printf 'feat(auth): add oauth\n\n- added provider\n- updated config' | npx rhachet run --skill git.commit.set -m @stdin --mode apply --push

# include unstaged changes
printf 'fix(typo): readme\n\n- fixed typo' | npx rhachet run --skill git.commit.set -m @stdin --mode apply --unstaged include
```

## .prerequisites

- human must grant quota: `git.commit.uses set --quant N --push allow|block`
- a sponsor: on the human's own machine, `git config user.name` + `user.email`
  name them and no bind is needed. a bind wins over git config; on the clone's
  machine (git config names a seaturtle identity) a human must bind one, at a
  real terminal: `rhx git.commit.sponsor set --who <@stdin|@self|"Name <email>">`
- for `--push`: requires `--push allow` in quota grant

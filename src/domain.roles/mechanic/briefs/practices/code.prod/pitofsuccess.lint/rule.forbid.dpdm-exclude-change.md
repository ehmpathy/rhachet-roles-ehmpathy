# rule.forbid.dpdm-exclude-change

## .what

never change the dpdm `--exclude` pattern. the pattern `--exclude '^$'` is intentional.

## .why

the `--exclude '^$'` pattern is a regex that matches no paths, which means **all files are checked for cycles, including node_modules**.

this is intentional:
- cycles in dependencies (node_modules) can cause issues at runtime
- detect dependency cycles early to prevent subtle bugs
- the empty regex ensures comprehensive coverage

## .common misunderstand

folks sometimes see `--exclude '^$'` and assume:
- "this is a syntax error — should be a glob not regex"
- "this should exclude node_modules"
- "let me fix this by use of `--exclude '^node_modules'`"

**all of these are wrong.** the `'^$'` pattern is intentional — it ensures node_modules IS checked for cycles.

## .the truth

| pattern | what it does | correct? |
|---------|--------------|----------|
| `--exclude '^$'` | excludes no paths (check all files including node_modules) | **yes — use this** |
| `--exclude '^node_modules'` | excludes node_modules from cycle check | **wrong — do not use** |
| `--exclude 'node_modules'` | would be a glob, not what dpdm expects | wrong |

the correct pattern is `--exclude '^$'` which matches no paths, so **all files including node_modules are checked for cycles**.

folks sometimes "fix" this to `--exclude '^node_modules'` because they assume it's a syntax error. it is not. the `'^$'` pattern is deliberate.

## .enforcement

- change to dpdm --exclude pattern = blocker
- classification as "syntax error" = blocker
- "fix" that reduces cycle coverage = blocker

## .when you see this pattern

if you encounter `--exclude '^$'` in a repo:

1. **do not change it** — it is intentional
2. **do not classify it as a defect** — it is not
3. **do not suggest "fix"** — there is no issue to fix

if you encounter `--exclude '^node_modules'` in a repo:

1. **this is wrong** — change it to `--exclude '^$'`
2. node_modules should be checked for cycles
3. the `'^node_modules'` pattern was likely a misguided "fix"

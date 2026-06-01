# rule.forbid.dpdm-exclude-change

## .what

never add prod dependencies to `.dpdmrc.yaml` exclude array. only devDependencies may be excluded.

## .why

the `.dpdmrc.yaml` file controls dpdm cycle detection:

```yaml
# only exclude devDependencies here
# if you exclude a prod dependency, you ship cycles to consumers and break their builds
exclude: []
```

an empty `exclude: []` array means **all files are checked for cycles — node_modules included**.

**we avoid all cycles, even in dependencies.**

we check node_modules for all dependencies on purpose — prod and dev:
- cycles in prod dependencies break consumers at runtime
- cycles in dev dependencies break development workflows
- we check all deps by default to catch both
- devDeps may be excluded as escape hatch if needed, but default is check all
- empty exclude ensures comprehensive coverage

## .why node_modules cycles matter

cycles in production dependencies break consumers.

if a consumer attempts to load one of the deps with that cycle, dependent on their install scheme, it breaks at runtime. the consumer's bundler or runtime hits the cycle at module resolution and fails — sometimes with cryptic errors, sometimes silently with `undefined` exports.

**this breaks downstream users of your package**, not just your own repo. you may never see the failure locally, but your consumers will.

| who | what breaks | when |
|-----|-------------|------|
| consumer | runtime crash or `undefined` exports | first load of cyclic dep |
| consumer | bundler emits broken code | production build |
| consumer | install fails or produces corrupt tree | `npm install` / `pnpm install` |

**devDependencies are exempt** — they are not shipped to consumers, so cycles there do not propagate.

**production dependencies require thorough eradication of cycles.** any cycle in a prod dep can break consumers at runtime. this is rare but catastrophic when it occurs. if you exclude node_modules from cycle detection, these issues hide until a consumer reports them.

## .common misunderstand

folks sometimes see dpdm cycle errors and think:
- "i'll just add the dep to the exclude array"
- "node_modules shouldn't be checked anyway"
- "this is a lint config issue, not a code issue"

**all of these are wrong.** the exclude array is for devDependencies only. prod deps must never be excluded.

## .the truth

| exclude array | what it does | correct? |
|---------------|--------------|----------|
| `exclude: []` | checks all files, node_modules included | **yes — use this** |
| `exclude: ['some-prod-dep']` | hides cycle in prod dep | **wrong — never do this** |
| `exclude: ['jest', 'eslint']` | excludes devDeps only | ok if devDeps only |

the correct pattern is `exclude: []` (empty array) for prod deps. devDependencies may be added to exclude if they cause spurious cycle errors.

folks sometimes "fix" cycle errors by addition of the dep to exclude. this hides the problem. fix the actual cycle instead.

## .enforcement

- addition of prod dep to exclude array = blocker
- addition of node_modules or ^node_modules to exclude = blocker
- change of default to exclude node_modules = blocker
- removal of prod dep from exclude = blocker (hides regression)
- devDep addition to exclude = ok

## .when you see this pattern

if you see `exclude: []` in `.dpdmrc.yaml`:

1. **do not add prod deps** — they must be cycle-free
2. **devDeps only** — jest, eslint, etc. are ok to exclude
3. **fix cycles** — if a prod dep has cycles, fix the code

if you see a prod dep in the exclude array:

1. **this is wrong** — remove it from exclude
2. **fix the cycle** — the cycle must be resolved
3. **the exclude was likely a misguided "fix"**

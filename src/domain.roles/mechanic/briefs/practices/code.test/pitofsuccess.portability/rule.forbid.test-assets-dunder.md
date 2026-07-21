# rule.forbid.test-assets-dunder

## severity: blocker

forbid `__test_assets__/` dunder directories for test fixtures. use `.test/assets/` instead.

---

## .what

test fixtures must live under a `.test/assets/` dot-directory. a `__test_assets__/` dunder directory is forbidden.

## .why

- `.test/` is hidden in file explorers by default (cleaner project view)
- the `__dunder__` pattern is a python convention, not idiomatic for typescript
- consistent with the other dot-directories (`.agent/`, `.behavior/`, `.route/`)
- one canonical fixture location — no drift between dunder and dot conventions

## .examples

### 👎 forbidden — dunder directory

```
src/
  domain.operations/
    __test_assets__/
      example.wave-report.json
```

### 👍 required — dot directory

```
src/
  domain.operations/
    .test/
      assets/
        example.wave-report.json
```

## .reference

see `ehmpathy/rhachet-roles-ghlitch`:
- `src/blackbox/.test/portable-ts-dispatch/`

## .enforcement

- a `__test_assets__/` fixture directory = **blocker** (use `.test/assets/`)

## .see also

- `rule.prefer.dot-dirs` — the broader dot-directory convention

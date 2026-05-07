# rule.require.hermetic-tests

## .what

tests must be hermetic: their outcome must not depend on the host environment.

## .why

- non-hermetic tests pass locally, fail in CI (or vice versa)
- shell functions, aliases, and dotfile config vary per machine
- flaky tests erode trust and waste debug time
- environment leaks are invisible until they cause failures

## .pattern

| hermetic | non-hermetic |
|----------|--------------|
| mock points to absolute binary path | mock overrides PATH and hopes shell finds it |
| test provisions its own deps | test assumes host has correct tool version |
| test creates its own config files | test relies on host dotfiles |
| test controls all env vars explicitly | test inherits uncontrolled env |

## .the test

"would this test produce the same result on a fresh CI runner with no dotfiles?"

- yes = hermetic
- no = environment leak

## .common leaks

| leak | symptom | fix |
|------|---------|-----|
| shell functions override PATH | mock binary not called | mock all names the function may dispatch to, or use absolute path |
| host tool version differs | unexpected flags or output format | pin version or mock entirely |
| inherited env vars | behavior differs per machine | explicitly set or unset relevant env vars |
| host locale/timezone | date formats differ | set `TZ=UTC`, `LC_ALL=C` in test env |

## .enforcement

- test that depends on host shell config = blocker
- test that assumes tool availability without provision = blocker

## .see also

- `rule.forbid.bare-host-deps` — tests must provision their own deps

# howto: mock CLI tools via PATH injection

## .caution

**use as last resort only.**

ideally, always test directly against the real CLI. real integration tests catch real bugs.

only use PATH mocks when:
- auth tokens would be leaked or misused
- real API calls would cost money or have side effects
- no test environment exists for the external service

if you can test against the real CLI safely, do that instead.

## .what

mock external CLI tools (gh, git, aws, etc.) by prepend a fake bin directory to PATH.

## .why

- auth tokens required but unsafe to use in tests
- real API calls would have side effects (create real PRs, push to real repos)
- need to test post-success output that only shows after real operations complete

## .pattern

```typescript
// create fake bin dir
const fakeBinDir = path.join(tempDir, '.fakebin');
fs.mkdirSync(fakeBinDir, { recursive: true });

// mock gh cli
fs.writeFileSync(
  path.join(fakeBinDir, 'gh'),
  `#!/bin/bash
if [[ "$1" == "pr" && "$2" == "list" ]]; then
  echo "[]"
  exit 0
elif [[ "$1" == "pr" && "$2" == "create" ]]; then
  echo "https://github.com/test/repo/pull/42"
  exit 0
fi
exit 1
`,
);
fs.chmodSync(path.join(fakeBinDir, 'gh'), '755');

// mock git push (pass through other commands)
fs.writeFileSync(
  path.join(fakeBinDir, 'git'),
  `#!/bin/bash
if [[ "$1" == "push" ]]; then
  echo "To github.com:test/repo.git"
  exit 0
fi
exec /usr/bin/git "$@"
`,
);
fs.chmodSync(path.join(fakeBinDir, 'git'), '755');

// run with fake bin first in PATH
const result = spawnSync('bash', [scriptPath], {
  env: {
    ...process.env,
    PATH: `${fakeBinDir}:${process.env.PATH}`,
  },
});
```

## .key points

1. **prepend to PATH** - fake bin dir comes first, so mocks found before real binaries
2. **pass through pattern** - for partial mocks, use `exec /usr/bin/real-binary "$@"` for unhandled commands
3. **chmod +x** - mock scripts must be executable
4. **match command signatures** - check `$1`, `$2`, etc. to match the exact invocation pattern
5. **return realistic output** - mock should emit output the real CLI would produce

## .when to use

- integration tests for shell scripts that call external CLIs
- test success paths that require real API responses
- test error paths with controlled failure modes
- verify post-operation output (e.g., success messages, reminders)

## .example: mock successful push + pr

```typescript
given('[case1] successful push with reminder', () => {
  when('[t0] push and pr creation succeed', () => {
    then('shows full output with reminder', () => {
      const tempDir = setupTempRepo({ ... });
      const fakeBinDir = path.join(tempDir, '.fakebin');
      fs.mkdirSync(fakeBinDir);

      // mock gh
      fs.writeFileSync(path.join(fakeBinDir, 'gh'), `#!/bin/bash
if [[ "$1" == "pr" && "$2" == "list" ]]; then echo "[]"; exit 0; fi
if [[ "$1" == "pr" && "$2" == "create" ]]; then echo "https://github.com/x/y/pull/1"; exit 0; fi
exit 1`);
      fs.chmodSync(path.join(fakeBinDir, 'gh'), '755');

      // mock git push
      fs.writeFileSync(path.join(fakeBinDir, 'git'), `#!/bin/bash
if [[ "$1" == "push" ]]; then exit 0; fi
exec /usr/bin/git "$@"`);
      fs.chmodSync(path.join(fakeBinDir, 'git'), '755');

      const result = runScript({
        env: { PATH: `${fakeBinDir}:${process.env.PATH}` },
      });

      expect(result.stdout).toContain('success message');
      expect(result.stdout).toMatchSnapshot();
    });
  });
});
```

## .see also

- howto.write-bdd.[lesson].md
- rule.forbid.remote-boundaries.md (for unit vs integration distinction)

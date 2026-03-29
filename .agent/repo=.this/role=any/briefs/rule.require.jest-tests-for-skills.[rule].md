# rule.require.jest-tests-for-skills

## .what

all skills must be tested via jest `.integration.test.ts` or `.acceptance.test.ts` files. never use `.test.sh` bash test files.

## .why

- jest provides consistent test runner across the codebase
- snapshots enable visual review of output in PRs
- `test-fns` given/when/then pattern improves readability
- ci runs jest tests automatically via `npm run test:integration`
- `.test.sh` files require manual execution and lack snapshot support

## .scope

applies to:
- shell skills (`*.sh`)
- claude hooks (`pretooluse.*.sh`, etc)
- any executable in `skills/` or `inits/`

## .pattern

```typescript
import { spawnSync } from 'child_process';
import * as path from 'path';
import { given, then, when } from 'test-fns';

describe('skill-name.sh', () => {
  const scriptPath = path.join(__dirname, 'skill-name.sh');

  const runSkill = (args: string[]): { stdout: string; stderr: string; exitCode: number } => {
    const result = spawnSync('bash', [scriptPath, ...args], {
      encoding: 'utf-8',
      stdio: ['pipe', 'pipe', 'pipe'],
    });
    return {
      stdout: result.stdout ?? '',
      stderr: result.stderr ?? '',
      exitCode: result.status ?? 1,
    };
  };

  given('[case1] scenario description', () => {
    when('[t0] action description', () => {
      then('expected outcome', () => {
        const result = runSkill(['--arg', 'value']);
        expect(result.exitCode).toBe(0);
        expect(result.stdout).toMatchSnapshot();
      });
    });
  });
});
```

## .examples

### good

```
src/domain.roles/mechanic/skills/git.commit/git.commit.set.integration.test.ts
src/domain.roles/mechanic/inits/claude.hooks/pretooluse.forbid-tmp-writes.integration.test.ts
```

### bad

```
src/domain.roles/mechanic/skills/git.commit/git.commit.set.test.sh
src/domain.roles/mechanic/inits/claude.hooks/pretooluse.forbid-tmp-writes.test.sh
```

## .enforcement

- `.test.sh` files = blocker
- shell skills without `.integration.test.ts` = nitpick

## .see also

- howto.write-bdd.[lesson].md
- rule.require.snapshots.[lesson].md

import { spawnSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import { genTempDir, given, then, when } from 'test-fns';

/**
 * .what = integration tests for init.claude.permissions.sh
 * .why = verify JSONC comment strip preserves :// in strings
 *        while correctly removes // comments
 */
describe('init.claude.permissions.sh', () => {
  const initPath = path.join(__dirname, 'init.claude.permissions.sh');

  /**
   * .what = helper to run init in a temp git repo
   */
  const runInit = (input: {
    permissionsJsonc: string;
    settingsJson?: string;
  }): { stdout: string; stderr: string; exitCode: number } => {
    // create temp dir with git repo
    const tempDir = genTempDir({ slug: 'init-permissions-test', git: true });
    const initsDir = path.join(tempDir, 'inits');
    const claudeDir = path.join(tempDir, '.claude');

    fs.mkdirSync(initsDir, { recursive: true });
    fs.mkdirSync(claudeDir, { recursive: true });

    // write permissions file
    const permissionsFile = path.join(
      initsDir,
      'init.claude.permissions.jsonc',
    );
    fs.writeFileSync(permissionsFile, input.permissionsJsonc);

    // write settings file if provided
    const settingsFile = path.join(claudeDir, 'settings.json');
    if (input.settingsJson) {
      fs.writeFileSync(settingsFile, input.settingsJson);
    }

    // copy the init to temp dir (so it can find the .jsonc file relative to itself)
    const tempInit = path.join(initsDir, 'init.claude.permissions.sh');
    fs.copyFileSync(initPath, tempInit);
    fs.chmodSync(tempInit, '755');

    // run the init
    const result = spawnSync('bash', [tempInit], {
      encoding: 'utf-8',
      cwd: tempDir,
      stdio: ['pipe', 'pipe', 'pipe'],
    });

    // read the result settings file
    let settingsResult = '';
    if (fs.existsSync(settingsFile)) {
      settingsResult = fs.readFileSync(settingsFile, 'utf-8');
    }

    return {
      stdout:
        (result.stdout ?? '') + '\n---settings.json---\n' + settingsResult,
      stderr: result.stderr ?? '',
      exitCode: result.status ?? 1,
    };
  };

  given('[case1] jsonc with :// in strings', () => {
    when('[t0] permissions file has name:// and path:// scope patterns', () => {
      then('it should preserve :// in strings and produce valid json', () => {
        const result = runInit({
          permissionsJsonc: `{
  // this is a comment
  "permissions": {
    "allow": [
      // standalone comment
      "Bash(rhx git.repo.test --what unit --scope 'name://getUserById')",
      "Bash(rhx git.repo.test --scope 'path://src/domain')", // end comment
      "Bash(echo hello)"
    ],
    "deny": [],
    "ask": []
  }
}`,
        });

        expect(result.exitCode).toBe(0);
        expect(result.stderr).not.toContain('parse error');
        expect(result.stdout).toContain('name://getUserById');
        expect(result.stdout).toContain('path://src/domain');
        expect(result.stdout).toMatchSnapshot();
      });
    });
  });

  given('[case2] jsonc with only // comments (no :// strings)', () => {
    when('[t0] permissions file has standard comments', () => {
      then('it should strip comments and produce valid json', () => {
        const result = runInit({
          permissionsJsonc: `{
  // header comment
  "permissions": {
    // allow section
    "allow": [
      "Bash(echo hello)", // safe command
      "Bash(pwd)"
    ],
    "deny": [], // empty deny
    "ask": []
  }
}`,
        });

        expect(result.exitCode).toBe(0);
        expect(result.stderr).not.toContain('parse error');
        expect(result.stdout).toContain('echo hello');
        expect(result.stdout).toContain('pwd');
        expect(result.stdout).toMatchSnapshot();
      });
    });
  });

  given('[case3] jsonc with https:// url in string', () => {
    when('[t0] permissions file has url with ://', () => {
      then('it should preserve the url', () => {
        const result = runInit({
          permissionsJsonc: `{
  "permissions": {
    "allow": [
      "Bash(curl https://api.example.com/v1)"
    ],
    "deny": [],
    "ask": []
  }
}`,
        });

        expect(result.exitCode).toBe(0);
        expect(result.stderr).not.toContain('parse error');
        expect(result.stdout).toContain('https://api.example.com/v1');
        expect(result.stdout).toMatchSnapshot();
      });
    });
  });

  given('[case4] empty settings file', () => {
    when('[t0] no prior settings.json exists', () => {
      then('it should create settings.json with permissions', () => {
        const result = runInit({
          permissionsJsonc: `{
  "permissions": {
    "allow": ["Bash(pwd)"],
    "deny": [],
    "ask": []
  }
}`,
        });

        expect(result.exitCode).toBe(0);
        expect(result.stdout).toContain('permissions');
        expect(result.stdout).toContain('pwd');
        expect(result.stdout).toMatchSnapshot();
      });
    });
  });

  given('[case5] prior settings exist', () => {
    when('[t0] settings.json has prior content', () => {
      then('it should merge permissions without loss of prior settings', () => {
        const result = runInit({
          permissionsJsonc: `{
  "permissions": {
    "allow": ["Bash(pwd)"],
    "deny": ["Bash(rm -rf)"],
    "ask": []
  }
}`,
          settingsJson: JSON.stringify(
            {
              hooks: { onBoot: [] },
              permissions: {
                allow: ['Bash(old-allow)'],
                deny: ['Bash(old-deny)'],
              },
            },
            null,
            2,
          ),
        });

        expect(result.exitCode).toBe(0);
        // hooks should be preserved
        expect(result.stdout).toContain('hooks');
        // allow should be replaced entirely
        expect(result.stdout).toContain('pwd');
        expect(result.stdout).not.toContain('old-allow');
        // deny should be merged (both old and new)
        expect(result.stdout).toContain('rm -rf');
        expect(result.stdout).toContain('old-deny');
        expect(result.stdout).toMatchSnapshot();
      });
    });
  });
});

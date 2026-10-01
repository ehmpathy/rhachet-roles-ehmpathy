import { spawnSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import { genTempDir, given, then, useThen, when } from 'test-fns';

/**
 * .what = integration tests for init.claude.permissions.sh
 * .why = verify JSONC comment strip preserves :// in strings
 *        while correctly removes // comments
 */
describe('init.claude.permissions.sh', () => {
  const initPath = path.join(__dirname, 'init.claude.permissions.sh');

  /**
   * .what = sanitize dynamic values from output for stable snapshots
   */
  const sanitizeOutput = (output: string): string =>
    output.replace(
      /settings\.\d{4}-\d{2}-\d{2}T\d{2}-\d{2}-\d{2}Z\.bak\.json/g,
      'settings.TIMESTAMP.bak.json',
    );

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
        expect(sanitizeOutput(result.stdout)).toMatchSnapshot();
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
        expect(sanitizeOutput(result.stdout)).toMatchSnapshot();
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
        expect(sanitizeOutput(result.stdout)).toMatchSnapshot();
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
        expect(sanitizeOutput(result.stdout)).toMatchSnapshot();
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
        expect(sanitizeOutput(result.stdout)).toMatchSnapshot();
      });
    });
  });

  given('[case5b] a prior settings.json from an older release', () => {
    // .note = an older release shipped Write(<path>) rules, which claude code
    //         never matches and flags at every boot. allow is replaced whole,
    //         but deny + ask only append — so reinit must drop them itself
    when('[t0] its deny + ask carry stale Write(<path>) rules', () => {
      const result = useThen('init runs over the older settings', () =>
        runInit({
          permissionsJsonc: `{
  "permissions": {
    "allow": ["Bash(pwd)"],
    "deny": ["Edit(.meter/*)"],
    "ask": []
  }
}`,
          settingsJson: JSON.stringify(
            {
              permissions: {
                allow: ['Write(.route/**)'],
                deny: [
                  'Write(.meter/*)',
                  'Write(.branch/.bind/*)',
                  'Bash(old-deny)',
                  'Write',
                ],
                ask: ['Write(**/.test/**)', 'Bash(old-ask)'],
              },
            },
            null,
            2,
          ),
        }),
      );

      then('it exits 0', () => {
        expect(result.exitCode).toBe(0);
      });

      then('no Write(<path>) rule survives in any list', () => {
        expect(result.stdout).not.toContain('Write(');
      });

      then('the other prior deny + ask rules survive', () => {
        expect(result.stdout).toContain('Bash(old-deny)');
        expect(result.stdout).toContain('Bash(old-ask)');
      });

      then('a bare Write tool rule survives', () => {
        expect(result.stdout).toContain('"Write"');
      });

      then('the manifest Edit deny lands', () => {
        expect(result.stdout).toContain('Edit(.meter/*)');
        expect(sanitizeOutput(result.stdout)).toMatchSnapshot();
      });
    });
  });

  given('[case6] the REAL manifest guards the sponsor mutations', () => {
    /**
     * .what = read the shipped `init.claude.permissions.jsonc` and assert the
     *         sponsor entries are present.
     *
     * .why = invariant 2 has two halves — the SKILL refuses a clone (clamped by
     *        `git.commit.sponsor` `[case4]`) and the PERMISSION ENGINE refuses
     *        the command before it ever runs. the second half rested on one
     *        manual observation in one session, so a regen of the manifest that
     *        dropped these lines would ship green and hand a clone back the
     *        ability to sponsor its own commits.
     *
     * .note = every OTHER case in this file supplies its own fixture jsonc, so
     *         they grade the ENGINE and are silent about what we ship. this one
     *         reads the shipped file, deliberately.
     */
    const manifest = fs.readFileSync(
      path.join(__dirname, 'init.claude.permissions.jsonc'),
      'utf-8',
    );

    when('[t0] the deny list is read', () => {
      then('it denies set and del, in BOTH the npx and rhx forms', () => {
        // .why = the bare `rhx` alias is a separate surface from the
        //        `npx rhachet run --skill` form, and a denial that covers
        //        one leaves the other wide open — the decorative-denial
        //        defect this repo already met once on git.commit.uses.
        for (const rule of [
          'Bash(npx rhachet run --skill git.commit.sponsor set:*)',
          'Bash(npx rhachet run --skill git.commit.sponsor del:*)',
          'Bash(rhx git.commit.sponsor set:*)',
          'Bash(rhx git.commit.sponsor del:*)',
        ])
          expect(manifest).toContain(rule);
      });

      then('it denies the `--` passthrough form too', () => {
        // `rhx git.commit.sponsor -- set` reaches the same subcommand by a
        // route a prefix match on `sponsor set` never sees
        for (const rule of [
          'Bash(rhx git.commit.sponsor -- set:*)',
          'Bash(rhx git.commit.sponsor -- del:*)',
        ])
          expect(manifest).toContain(rule);
      });

      then('🔴 git.commit.bind closes the SAME `--` route', () => {
        // 🔴 .why = it matters MORE on bind than on the sponsor. the sponsor
        //        has two guards — this manifest AND a tty check in the skill —
        //        so a gap here still meets a second refusal. `git.commit.bind`
        //        carries no actor guard at all (verified: no `-t` and no
        //        `__I_AM_HUMAN` anywhere in git.commit.bind.sh), so this
        //        manifest is its ONLY line of defense, and a route left open
        //        here is simply open.
        //
        // .note = the gap was invisible until the sponsor's `--` entries were
        //        written beside bind's — the half-applied shape this drive
        //        already met once on the ROLE_REPO consolidation.
        for (const rule of [
          'Bash(npx rhachet run --skill git.commit.bind -- set:*)',
          'Bash(npx rhachet run --skill git.commit.bind -- del:*)',
          'Bash(rhx git.commit.bind -- set:*)',
          'Bash(rhx git.commit.bind -- del:*)',
        ])
          expect(manifest).toContain(rule);
      });
    });

    when('[t1] the allow list is read', () => {
      then('it permits get — a read is not a mutation', () => {
        // invariant 3: the clone must be able to explain its own state
        expect(manifest).toContain(
          'Bash(npx rhachet run --skill git.commit.sponsor get)',
        );
      });
    });
  });

  given(
    '[case7] the REAL manifest declares file-path rules as Edit(...) only',
    () => {
      /**
       * .what = the shipped manifest holds no `Write(...)` rule, and every path
       *         the retired `Write(...)` rules named still sits under an
       *         `Edit(...)` rule.
       *
       * .why = claude code ignores a `Write(path)` rule and prints a warn for
       *        each one at every session boot; `Edit(path)` already covers every
       *        file-edit tool, Write included. so a `Write(...)` rule is noise
       *        that protects no path.
       *
       * 🔴 .why the second assert = the DENY half guards the quota meter and the
       *        bind dir from the clone. a cleanup that dropped an `Edit` twin by
       *        mistake would open the meter, and the first assert alone would
       *        still pass.
       *
       * .note = the asserts match QUOTED rules, never bare text — the manifest's
       *         own comments name `Write(path)` in prose.
       */
      const manifest = fs.readFileSync(
        path.join(__dirname, 'init.claude.permissions.jsonc'),
        'utf-8',
      );

      when('[t0] the rules are read', () => {
        then('no rule opens with Write(', () => {
          expect(manifest).not.toMatch(/"Write\(/);
        });

        // 🔴 .why each list is sliced = the DENY twins must stay DENY. a rule
        //        moved from deny to allow is still "in the manifest", so a
        //        whole-file assert would pass while it opened the meter.
        const sectionDeny = manifest.slice(
          manifest.indexOf('"deny": ['),
          manifest.indexOf('"ask": ['),
        );
        const sectionAllow = manifest.slice(manifest.indexOf('"allow": ['));

        then(
          'each deny path the Write rules named is still an Edit deny',
          () => {
            expect(sectionDeny).toContain('"deny": [');
            for (const rule of [
              '"Edit(.meter/*)"',
              '"Edit(.branch/.bind/*)"',
              '"Edit(*/**/.route/**)"',
            ]) {
              expect(sectionDeny).toContain(rule);
              expect(sectionAllow).not.toContain(rule);
            }
          },
        );

        then(
          'each allow path the Write rules named is still an Edit allow',
          () => {
            expect(sectionAllow).toContain('"allow": [');
            for (const rule of [
              '"Edit(.agent/.notes/**)"',
              '"Edit(.route/**)"',
              '"Edit(**/.test/**)"',
            ])
              expect(sectionAllow).toContain(rule);
          },
        );
      });
    },
  );
});

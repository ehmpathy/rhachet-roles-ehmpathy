import { spawnSync } from 'child_process';
import { copyFileSync, writeFileSync } from 'fs';
import * as path from 'path';
import { genTempDir, given, then, when } from 'test-fns';

/**
 * .what = integration tests for pretooluse.forbid-suspicious-shell-syntax.sh
 * .why = verify the hook correctly blocks unquoted shell metacharacters
 *        while it allows quoted regex patterns and safe commands
 */
describe('pretooluse.forbid-suspicious-shell-syntax.sh', () => {
  const scriptPath = path.join(
    __dirname,
    'pretooluse.forbid-suspicious-shell-syntax.sh',
  );

  /**
   * .what = helper to run the hook with a command
   * .why = simplifies test assertions
   */
  const runHook = (
    command: string,
  ): {
    stdout: string;
    stderr: string;
    exitCode: number;
  } => {
    const stdinJson = JSON.stringify({
      tool_name: 'Bash',
      tool_input: { command },
    });

    const result = spawnSync('bash', [scriptPath], {
      encoding: 'utf-8',
      input: stdinJson,
      stdio: ['pipe', 'pipe', 'pipe'],
    });

    return {
      stdout: result.stdout ?? '',
      stderr: result.stderr ?? '',
      exitCode: result.status ?? 1,
    };
  };

  given(
    '[case0] the redteam: a quote of one kind inside the other kind',
    () => {
      // 🔴 the `$(` / backtick scan once tracked single quotes alone, so an apostrophe inside a
      //    double-quoted span read as an open single quote and hid every substitution after it.
      //    each row is one bypass shape (must block) or one over-block guard (must permit).
      const ROWS: { command: string; verdict: 'block' | 'permit' }[] = [
        // the bypass class: an apostrophe inside double quotes, then a live substitution
        {
          command: `rhx foo --arg "it's a test" $(rm -rf ~)`,
          verdict: 'block',
        },
        {
          command: 'rhx foo --arg "surfer\'s wave" `rm -rf ~`',
          verdict: 'block',
        },
        { command: `echo "kai's" "board's" $(whoami)`, verdict: 'block' },
        // a double quote inside single quotes, then a live substitution
        { command: `rhx foo --arg 'say "aloha"' $(whoami)`, verdict: 'block' },
        // a substitution inside double quotes still runs
        { command: `rhx foo --arg "$(whoami)"`, verdict: 'block' },
        // the over-block guards: a substitution inside single quotes is inert
        { command: `rhx foo --arg 'it is $(literal)'`, verdict: 'permit' },
        {
          command: `rhx foo --arg "it's calm" --to 'tide $(x)'`,
          verdict: 'permit',
        },
      ];

      ROWS.forEach((row) => {
        when(`[t0] ${row.command}`, () => {
          then(`it ${row.verdict}s`, () => {
            const result = runHook(row.command);
            expect(result.exitCode).toBe(row.verdict === 'block' ? 2 : 0);
          });
        });
      });
    },
  );

  given('[case1] unquoted =( (zsh process substitution)', () => {
    when('[t0] command contains unquoted =(', () => {
      then('diff =(curl a) =(curl b) is blocked', () => {
        const result = runHook('diff =(curl http://a) =(curl http://b)');
        expect(result.exitCode).toBe(2);
        expect(result.stderr).toContain('✋ ConstraintError:');
        expect(result.stderr).toContain('zsh process substitution');
      });

      then('cat =(echo hello) is blocked', () => {
        const result = runHook('cat =(echo hello)');
        expect(result.exitCode).toBe(2);
        expect(result.stderr).toContain('✋ ConstraintError:');
      });

      then('vim =(git diff) is blocked', () => {
        const result = runHook('vim =(git diff)');
        expect(result.exitCode).toBe(2);
        expect(result.stderr).toContain('✋ ConstraintError:');
      });

      then('=( in middle of command is blocked', () => {
        const result = runHook('cmd =(other) more');
        expect(result.exitCode).toBe(2);
        expect(result.stderr).toContain('✋ ConstraintError:');
      });

      then('=( after && is blocked', () => {
        const result = runHook('echo test && cat =(foo)');
        expect(result.exitCode).toBe(2);
        expect(result.stderr).toContain('✋ ConstraintError:');
      });
    });
  });

  given('[case2] quoted =( in regex patterns', () => {
    when('[t0] =( is inside quotes', () => {
      then('double-quoted regex with () is allowed', () => {
        const result = runHook(
          'npm run test:unit -- --testPathPattern="(foo|bar)"',
        );
        expect(result.exitCode).toBe(0);
        expect(result.stdout).toBe('');
        expect(result.stderr).toBe('');
      });

      then('single-quoted regex with () is allowed', () => {
        const result = runHook(
          "npm run test:unit -- --testPathPattern='(foo|bar)'",
        );
        expect(result.exitCode).toBe(0);
        expect(result.stdout).toBe('');
      });

      then('grep with quoted regex is allowed', () => {
        const result = runHook('grep -E "(foo|bar)" file.txt');
        expect(result.exitCode).toBe(0);
        expect(result.stdout).toBe('');
      });

      then('jest with quoted test pattern is allowed', () => {
        const result = runHook('jest --testPathPattern="(setStone|getStone)"');
        expect(result.exitCode).toBe(0);
        expect(result.stdout).toBe('');
      });

      then('=( inside double quotes is allowed', () => {
        const result = runHook('echo "=(not substitution)"');
        expect(result.exitCode).toBe(0);
        expect(result.stdout).toBe('');
      });

      then('=( inside single quotes is allowed', () => {
        const result = runHook("echo '=(not substitution)'");
        expect(result.exitCode).toBe(0);
        expect(result.stdout).toBe('');
      });

      then('=( in quoted argument is allowed', () => {
        const result = runHook('npm test -- --grep="=(test)"');
        expect(result.exitCode).toBe(0);
        expect(result.stdout).toBe('');
      });
    });
  });

  given('[case3] unquoted <( (bash process substitution)', () => {
    when('[t0] command contains unquoted <(', () => {
      then('diff <(ls dir1) <(ls dir2) is blocked', () => {
        const result = runHook('diff <(ls dir1) <(ls dir2)');
        expect(result.exitCode).toBe(2);
        expect(result.stderr).toContain('✋ ConstraintError:');
        expect(result.stderr).toContain('process substitution');
      });

      then('cat <(echo hello) is blocked', () => {
        const result = runHook('cat <(echo hello)');
        expect(result.exitCode).toBe(2);
        expect(result.stderr).toContain('✋ ConstraintError:');
      });

      then('redirect from <() is blocked', () => {
        const result = runHook('while read line; do echo $line; done < <(cmd)');
        expect(result.exitCode).toBe(2);
        expect(result.stderr).toContain('✋ ConstraintError:');
      });

      then('paste with two <() is blocked', () => {
        const result = runHook('paste <(cut -f1 a) <(cut -f1 b)');
        expect(result.exitCode).toBe(2);
        expect(result.stderr).toContain('✋ ConstraintError:');
      });
    });
  });

  given('[case4] quoted <(', () => {
    when('[t0] <( is inside quotes', () => {
      then('<( in double quotes is allowed', () => {
        const result = runHook('echo "<(not a substitution)"');
        expect(result.exitCode).toBe(0);
        expect(result.stdout).toBe('');
      });

      then('<( in single quotes is allowed', () => {
        const result = runHook("echo '<(not a substitution)'");
        expect(result.exitCode).toBe(0);
        expect(result.stdout).toBe('');
      });

      then('search for <( literal is allowed', () => {
        const result = runHook('grep "<(" file.txt');
        expect(result.exitCode).toBe(0);
        expect(result.stdout).toBe('');
      });
    });
  });

  given('[case5] unquoted >( (process substitution output)', () => {
    when('[t0] command contains unquoted >(', () => {
      then('tee >(other) is blocked', () => {
        const result = runHook('cmd | tee >(other)');
        expect(result.exitCode).toBe(2);
        expect(result.stderr).toContain('✋ ConstraintError:');
      });

      then('redirect to >() is blocked', () => {
        const result = runHook('echo test > >(cat)');
        expect(result.exitCode).toBe(2);
        expect(result.stderr).toContain('✋ ConstraintError:');
      });

      then('ls > >(grep) is blocked', () => {
        const result = runHook('ls > >(grep foo)');
        expect(result.exitCode).toBe(2);
        expect(result.stderr).toContain('✋ ConstraintError:');
      });
    });
  });

  given('[case6] quoted >(', () => {
    when('[t0] >( is inside quotes', () => {
      then('>( in double quotes is allowed', () => {
        const result = runHook('echo ">(not a substitution)"');
        expect(result.exitCode).toBe(0);
        expect(result.stdout).toBe('');
      });

      then('>( in single quotes is allowed', () => {
        const result = runHook("echo '>(not a substitution)'");
        expect(result.exitCode).toBe(0);
        expect(result.stdout).toBe('');
      });
    });
  });

  given('[case7] normal commands', () => {
    when('[t0] safe shell commands', () => {
      then('simple ls is allowed', () => {
        const result = runHook('ls -la');
        expect(result.exitCode).toBe(0);
        expect(result.stdout).toBe('');
      });

      then('npm run is allowed', () => {
        const result = runHook('npm run test');
        expect(result.exitCode).toBe(0);
        expect(result.stdout).toBe('');
      });

      then('git status is allowed', () => {
        const result = runHook('git status');
        expect(result.exitCode).toBe(0);
        expect(result.stdout).toBe('');
      });

      then('pipe is allowed', () => {
        const result = runHook('echo hello | grep h');
        expect(result.exitCode).toBe(0);
        expect(result.stdout).toBe('');
      });

      then('stdout redirect is blocked', () => {
        const result = runHook('cat file.txt > output.txt');
        expect(result.exitCode).toBe(2);
        expect(result.stderr).toContain('✋ ConstraintError:');
        expect(result.stderr).toContain('output redirection');
      });

      then('compound && is allowed', () => {
        const result = runHook('cmd1 && cmd2');
        expect(result.exitCode).toBe(0);
        expect(result.stdout).toBe('');
      });

      then('compound || is allowed', () => {
        const result = runHook('cmd1 || cmd2');
        expect(result.exitCode).toBe(0);
        expect(result.stdout).toBe('');
      });

      then('for loop is allowed', () => {
        const result = runHook('for i in 1 2 3; do echo $i; done');
        expect(result.exitCode).toBe(0);
        expect(result.stdout).toBe('');
      });

      then('if statement is allowed', () => {
        const result = runHook('if [ -f file ]; then cat file; fi');
        expect(result.exitCode).toBe(0);
        expect(result.stdout).toBe('');
      });

      then('command substitution $() is blocked', () => {
        const result = runHook('echo $(date)');
        expect(result.exitCode).toBe(2);
        expect(result.stderr).toContain('✋ ConstraintError:');
        expect(result.stderr).toContain('command substitution');
      });

      then('variable assignment with $() is blocked', () => {
        const result = runHook('VAR=$(cmd)');
        expect(result.exitCode).toBe(2);
        expect(result.stderr).toContain('✋ ConstraintError:');
      });

      /**
       * .note = known limitation: arr=(1 2 3) is blocked as false positive
       *         the hook sees `=(` pattern but this is bash array assignment,
       *         not zsh process substitution. a fix requires lookahead for
       *         variable name before `=`. for now, document this behavior.
       */
      then(
        'array assignment is blocked (false positive - known limitation)',
        () => {
          const result = runHook('arr=(1 2 3)');
          expect(result.exitCode).toBe(2);
          expect(result.stderr).toContain('✋ ConstraintError:');
        },
      );

      then('array expansion is allowed', () => {
        const result = runHook('echo ${arr[@]}');
        expect(result.exitCode).toBe(0);
        expect(result.stdout).toBe('');
      });
    });
  });

  given('[case8] edge cases', () => {
    when('[t0] empty or absent command', () => {
      then('empty command exits 0', () => {
        const stdinJson = JSON.stringify({
          tool_name: 'Bash',
          tool_input: { command: '' },
        });
        const result = spawnSync('bash', [scriptPath], {
          encoding: 'utf-8',
          input: stdinJson,
          stdio: ['pipe', 'pipe', 'pipe'],
        });
        expect(result.status).toBe(0);
      });

      then('absent command field exits 0', () => {
        const stdinJson = JSON.stringify({
          tool_name: 'Bash',
          tool_input: {},
        });
        const result = spawnSync('bash', [scriptPath], {
          encoding: 'utf-8',
          input: stdinJson,
          stdio: ['pipe', 'pipe', 'pipe'],
        });
        expect(result.status).toBe(0);
      });

      then('empty stdin exits 2 (error)', () => {
        const result = spawnSync('bash', [scriptPath], {
          encoding: 'utf-8',
          input: '',
          stdio: ['pipe', 'pipe', 'pipe'],
        });
        expect(result.status).toBe(2);
      });
    });

    when('[t1] mixed quotes with =( after close quote', () => {
      then('=() after quoted string is blocked', () => {
        const result = runHook('echo "hello" =(cmd)');
        expect(result.exitCode).toBe(2);
        expect(result.stderr).toContain('✋ ConstraintError:');
      });

      then('=() after single-quoted string is blocked', () => {
        const result = runHook("echo 'hello' =(cmd)");
        expect(result.exitCode).toBe(2);
        expect(result.stderr).toContain('✋ ConstraintError:');
      });
    });

    when('[t2] nested quotes', () => {
      /**
       * .note = known limitation: escaped quotes inside strings confuse
       *         the simple quote tracker. the hook sees the backslash but
       *         does not track escape state, so it miscounts quote depth.
       */
      then('=() in nested double quotes is blocked (known limitation)', () => {
        const result = runHook('bash -c "echo \\"=(test)\\""');
        expect(result.exitCode).toBe(2);
        expect(result.stderr).toContain('✋ ConstraintError:');
      });
    });
  });

  given('[case9] consecutive quotes at word start', () => {
    when('[t0] potential obfuscation patterns', () => {
      then('single-then-double quote at word start is blocked', () => {
        const result = runHook('grep \'"test:unit"\' file');
        expect(result.exitCode).toBe(2);
        expect(result.stderr).toContain('✋ ConstraintError:');
        expect(result.stderr).toContain('consecutive quotes');
      });

      then('double-then-single at word start is blocked', () => {
        const result = runHook('grep "\'"\'"\'"test"\'"\'"\'" file');
        expect(result.exitCode).toBe(2);
        expect(result.stderr).toContain('✋ ConstraintError:');
      });

      then('consecutive quotes in echo is blocked', () => {
        const result = runHook('echo \'"hello"\'');
        expect(result.exitCode).toBe(2);
        expect(result.stderr).toContain('✋ ConstraintError:');
      });

      /**
       * .note = mandatory blocker: consecutive quotes at word start.
       *         use --old '"$CI"' with proper escape or a variable instead.
       */
      then('sedreplace with quoted pattern is blocked', () => {
        const result = runHook(
          "npx rhachet run --skill sedreplace --old '\"$CI\"' --new '\"${CI:-}\"' --glob 'package.json'",
        );
        expect(result.exitCode).toBe(2);
        expect(result.stderr).toContain('✋ ConstraintError:');
      });

      /**
       * .note = mandatory blocker: consecutive quotes trigger permission prompts
       *         in claude code. use grep -E "test:(unit|integration)" instead
       *         or assign to a variable first.
       */
      then('grep with regex alternation in quotes is blocked', () => {
        const result = runHook(
          'grep -E \'"test:(unit|integration|acceptance)"\' package.json',
        );
        expect(result.exitCode).toBe(2);
        expect(result.stderr).toContain('✋ ConstraintError:');
      });

      /**
       * .note = mandatory blocker: sedreplace --old with prefixed quote inside
       *         double quotes creates consecutive quote pattern at word start.
       *         use --old "git.release --to" (no prefix quote) instead.
       */
      then('sedreplace with prefix quote in old pattern is blocked', () => {
        const result = runHook(
          `npx rhachet run --skill sedreplace --old "'git.release --to" --new "'git.release --into" --glob 'src/**/*.ts' --mode apply`,
        );
        expect(result.exitCode).toBe(2);
        expect(result.stderr).toContain('✋ ConstraintError:');
        expect(result.stderr).toContain('consecutive quotes');
      });
    });
  });

  given('[case10] valid quote patterns', () => {
    when('[t0] normal quoted strings', () => {
      then('simple double quotes is allowed', () => {
        const result = runHook('grep "test" file');
        expect(result.exitCode).toBe(0);
        expect(result.stdout).toBe('');
      });

      then('simple single quotes is allowed', () => {
        const result = runHook("grep 'test' file");
        expect(result.exitCode).toBe(0);
        expect(result.stdout).toBe('');
      });

      then('double quoted string is allowed', () => {
        const result = runHook('echo "hello world"');
        expect(result.exitCode).toBe(0);
        expect(result.stdout).toBe('');
      });

      then('single quoted string is allowed', () => {
        const result = runHook("echo 'hello world'");
        expect(result.exitCode).toBe(0);
        expect(result.stdout).toBe('');
      });

      then('variable assignment is allowed', () => {
        const result = runHook('VAR="test" && echo $VAR');
        expect(result.exitCode).toBe(0);
        expect(result.stdout).toBe('');
      });
    });
  });

  given('[case11] real-world patterns', () => {
    when('[t0] complex but valid commands', () => {
      then('jest with multiple test patterns is allowed', () => {
        const result = runHook(
          'npm run test:unit -- --testPathPattern="(setStoneAsRewound|delStoneGuardArtifacts|getOneStoneGuardApproval|stepRouteStoneSet)" --verbose',
        );
        expect(result.exitCode).toBe(0);
        expect(result.stdout).toBe('');
      });

      then('grep with alternation is allowed', () => {
        const result = runHook(
          'grep -E "(error|warn|fail)" log.txt | head -20',
        );
        expect(result.exitCode).toBe(0);
        expect(result.stdout).toBe('');
      });

      then('find with grep pattern is allowed', () => {
        const result = runHook(
          'find . -name "*.ts" -exec grep -l "(TODO|FIXME)" {} \\;',
        );
        expect(result.exitCode).toBe(0);
        expect(result.stdout).toBe('');
      });

      then('sed with capture groups is allowed', () => {
        const result = runHook(
          'sed -E "s/(old)(pattern)/\\1-new-\\2/g" file.txt',
        );
        expect(result.exitCode).toBe(0);
        expect(result.stdout).toBe('');
      });
    });
  });

  given('[case12] block message snapshots', () => {
    when('[t0] each pattern type produces expected output', () => {
      then('=( block message matches snapshot', () => {
        const result = runHook('cat =(echo hello)');
        expect(result.stderr).toMatchSnapshot();
      });

      then('<( block message matches snapshot', () => {
        const result = runHook('diff <(ls a) <(ls b)');
        expect(result.stderr).toMatchSnapshot();
      });

      then('>( block message matches snapshot', () => {
        const result = runHook('cmd | tee >(other)');
        expect(result.stderr).toMatchSnapshot();
      });

      then('consecutive quotes block message matches snapshot', () => {
        const result = runHook('grep \'"test"\' file');
        expect(result.stderr).toMatchSnapshot();
      });
    });
  });

  given('[case13] || operator (should remain allowed)', () => {
    when('[t0] various || patterns', () => {
      then('simple fallback is allowed', () => {
        const result = runHook('cmd || echo fallback');
        expect(result.exitCode).toBe(0);
        expect(result.stdout).toBe('');
      });

      then('grep with fallback echo (no redirect) is allowed', () => {
        const result = runHook('grep -r "else {" src/ || echo "not found"');
        expect(result.exitCode).toBe(0);
        expect(result.stdout).toBe('');
      });

      then('|| true is allowed', () => {
        const result = runHook('cmd || true');
        expect(result.exitCode).toBe(0);
        expect(result.stdout).toBe('');
      });

      then('chained || is allowed', () => {
        const result = runHook('cmd1 || cmd2 || cmd3');
        expect(result.exitCode).toBe(0);
        expect(result.stdout).toBe('');
      });

      then('|| after && is allowed', () => {
        const result = runHook('cmd1 && cmd2 || cmd3');
        expect(result.exitCode).toBe(0);
        expect(result.stdout).toBe('');
      });
    });
  });

  given('[case14] ANSI-C quote syntax', () => {
    when("[t0] command contains $'...'", () => {
      then("$'...' is blocked", () => {
        const result = runHook("echo $'hello\\nworld'");
        expect(result.exitCode).toBe(2);
        expect(result.stderr).toContain('✋ ConstraintError:');
        expect(result.stderr).toContain('ANSI-C');
      });

      then("$'...' with escape sequences is blocked", () => {
        const result = runHook("printf $'\\x1b[31mred\\x1b[0m'");
        expect(result.exitCode).toBe(2);
        expect(result.stderr).toContain('✋ ConstraintError:');
      });
    });

    when('[t1] normal dollar patterns', () => {
      then('$VAR is allowed', () => {
        const result = runHook('echo $HOME');
        expect(result.exitCode).toBe(0);
        expect(result.stdout).toBe('');
      });

      then('${VAR} is allowed', () => {
        const result = runHook('echo ${HOME}');
        expect(result.exitCode).toBe(0);
        expect(result.stdout).toBe('');
      });
    });
  });

  given('[case15] backtick command substitution', () => {
    when('[t0] command contains backticks', () => {
      then('backtick substitution is blocked', () => {
        const result = runHook('echo `date`');
        expect(result.exitCode).toBe(2);
        expect(result.stderr).toContain('✋ ConstraintError:');
        expect(result.stderr).toContain('backtick');
      });

      then('nested backticks is blocked', () => {
        const result = runHook('echo `echo \\`date\\``');
        expect(result.exitCode).toBe(2);
        expect(result.stderr).toContain('✋ ConstraintError:');
      });

      then('assignment with backtick is blocked', () => {
        const result = runHook('VAR=`cmd`');
        expect(result.exitCode).toBe(2);
        expect(result.stderr).toContain('✋ ConstraintError:');
      });
    });

    when('[t1] backtick in quotes', () => {
      then('backtick in double quotes is blocked (still executes)', () => {
        const result = runHook('echo "`date`"');
        expect(result.exitCode).toBe(2);
        expect(result.stderr).toContain('✋ ConstraintError:');
      });

      then('backtick in single quotes is allowed (literal)', () => {
        const result = runHook("echo '`not executed`'");
        expect(result.exitCode).toBe(0);
        expect(result.stdout).toBe('');
      });
    });
  });

  given('[case16] $() command substitution', () => {
    when('[t0] unquoted command substitution', () => {
      then('echo $(date) is blocked', () => {
        const result = runHook('echo $(date)');
        expect(result.exitCode).toBe(2);
        expect(result.stderr).toContain('✋ ConstraintError:');
        expect(result.stderr).toContain('command substitution');
      });

      then('nested $() is blocked', () => {
        const result = runHook('echo $(echo $(date))');
        expect(result.exitCode).toBe(2);
        expect(result.stderr).toContain('✋ ConstraintError:');
      });
    });

    when('[t1] $() in quotes', () => {
      then('$() in single quotes is allowed (literal)', () => {
        const result = runHook("echo '$(not executed)'");
        expect(result.exitCode).toBe(0);
        expect(result.stdout).toBe('');
      });

      then('$() in double quotes is blocked (still executes)', () => {
        const result = runHook('echo "$(date)"');
        expect(result.exitCode).toBe(2);
        expect(result.stderr).toContain('✋ ConstraintError:');
      });
    });
  });

  given('[case17] output redirection', () => {
    when('[t0] unquoted output redirection', () => {
      then('simple > redirect is blocked', () => {
        const result = runHook('cat file.txt > output.txt');
        expect(result.exitCode).toBe(2);
        expect(result.stderr).toContain('✋ ConstraintError:');
        expect(result.stderr).toContain('output redirection');
      });

      then('append >> redirect is blocked', () => {
        const result = runHook('echo "line" >> log.txt');
        expect(result.exitCode).toBe(2);
        expect(result.stderr).toContain('✋ ConstraintError:');
      });

      then('stderr 2> redirect is blocked', () => {
        const result = runHook('cmd 2> errors.txt');
        expect(result.exitCode).toBe(2);
        expect(result.stderr).toContain('✋ ConstraintError:');
      });

      then('fd duplication 2>&1 is blocked', () => {
        const result = runHook('cmd 2>&1');
        expect(result.exitCode).toBe(2);
        expect(result.stderr).toContain('✋ ConstraintError:');
      });

      then('fd duplication >&2 is blocked', () => {
        const result = runHook('echo error >&2');
        expect(result.exitCode).toBe(2);
        expect(result.stderr).toContain('✋ ConstraintError:');
      });

      then('combined redirect &> is blocked', () => {
        const result = runHook('cmd &> /dev/null');
        expect(result.exitCode).toBe(2);
        expect(result.stderr).toContain('✋ ConstraintError:');
      });

      then('2>&2 (noop stderr) is blocked', () => {
        const result = runHook('npm run test 2>&2 | tail -50');
        expect(result.exitCode).toBe(2);
        expect(result.stderr).toContain('✋ ConstraintError:');
      });

      then('redirect after pipe is blocked', () => {
        const result = runHook('cmd1 | cmd2 > output.txt');
        expect(result.exitCode).toBe(2);
        expect(result.stderr).toContain('✋ ConstraintError:');
      });
    });

    when('[t1] > in quotes', () => {
      then('> in double quotes is allowed', () => {
        const result = runHook('echo "a > b"');
        expect(result.exitCode).toBe(0);
        expect(result.stdout).toBe('');
      });

      then('> in single quotes is allowed', () => {
        const result = runHook("echo 'a > b'");
        expect(result.exitCode).toBe(0);
        expect(result.stdout).toBe('');
      });

      then('grep for > pattern is allowed', () => {
        const result = runHook('grep ">" file.txt');
        expect(result.exitCode).toBe(0);
        expect(result.stdout).toBe('');
      });

      then('regex with > in quotes is allowed', () => {
        const result = runHook('grep -E "a->b" file.txt');
        expect(result.exitCode).toBe(0);
        expect(result.stdout).toBe('');
      });
    });
  });

  given('[case18] block message snapshots for new patterns', () => {
    when('[t0] each new pattern type produces expected output', () => {
      then('ANSI-C block message matches snapshot', () => {
        const result = runHook("echo $'test'");
        expect(result.stderr).toMatchSnapshot();
      });

      then('backtick block message matches snapshot', () => {
        const result = runHook('echo `date`');
        expect(result.stderr).toMatchSnapshot();
      });

      then('$() block message matches snapshot', () => {
        const result = runHook('echo $(date)');
        expect(result.stderr).toMatchSnapshot();
      });

      then('output redirection block message matches snapshot', () => {
        const result = runHook('cat file > output.txt');
        expect(result.stderr).toMatchSnapshot();
      });
    });
  });

  given('[case19] echo of a quoted dash-prefixed separator', () => {
    when('[t0] echo of a quoted string that starts with a dash', () => {
      then("echo '---abc' is blocked", () => {
        const result = runHook("echo '---abc'");
        expect(result.exitCode).toBe(2);
        expect(result.stderr).toContain('✋ ConstraintError:');
        expect(result.stderr).toContain('starts with a dash');
      });

      then('echo "---abc" is blocked', () => {
        const result = runHook('echo "---abc"');
        expect(result.exitCode).toBe(2);
        expect(result.stderr).toContain('✋ ConstraintError:');
      });

      then("echo '-- is blocked", () => {
        const result = runHook("echo '--");
        expect(result.exitCode).toBe(2);
        expect(result.stderr).toContain('✋ ConstraintError:');
      });

      then("echo '- is blocked", () => {
        const result = runHook("echo '-");
        expect(result.exitCode).toBe(2);
        expect(result.stderr).toContain('✋ ConstraintError:');
      });

      then('chained separator between safe commands is blocked', () => {
        const result = runHook(
          'gh pr list --state open --limit 5; echo "---all open---"; gh pr list --limit 10',
        );
        expect(result.exitCode).toBe(2);
        expect(result.stderr).toContain('✋ ConstraintError:');
      });
    });

    when('[t1] safe echoes remain allowed', () => {
      then('echo "not found" is allowed', () => {
        const result = runHook('echo "not found"');
        expect(result.exitCode).toBe(0);
        expect(result.stdout).toBe('');
      });

      then("echo 'hello world' is allowed", () => {
        const result = runHook("echo 'hello world'");
        expect(result.exitCode).toBe(0);
        expect(result.stdout).toBe('');
      });

      then('echo of a non-dash divider is allowed', () => {
        const result = runHook("echo '=== all open ==='");
        expect(result.exitCode).toBe(0);
        expect(result.stdout).toBe('');
      });

      then('echo with dashes off the start is allowed', () => {
        const result = runHook("echo 'all open ---'");
        expect(result.exitCode).toBe(0);
        expect(result.stdout).toBe('');
      });
    });

    when('[t2] block message snapshot', () => {
      then('dash-prefixed echo block message matches snapshot', () => {
        const result = runHook('echo "---all open---"');
        expect(result.stderr).toMatchSnapshot();
      });
    });
  });

  given('[case20] the config the hook reads', () => {
    // 🔴 a config jq could not parse once read as "no patterns", and the hook exited 0 —
    //    the whole gate off, with no word. an ABSENT config is the one quiet off switch;
    //    a malformed one blocks, loud, and names jq's own complaint.

    /**
     * .what = run a copy of the hook beside a crafted config (null = no config at all)
     * .why = the hook reads its config from beside itself, so a crafted config needs a
     *        copy of the hook in a sandbox — the real config is never touched
     */
    const runHookBesideConfig = (input: {
      config: string | null;
      command: string;
    }): { stderr: string; exitCode: number } => {
      const dir = genTempDir({ slug: 'suspicious-syntax-config' });
      const hookCopy = path.join(
        dir,
        'pretooluse.forbid-suspicious-shell-syntax.sh',
      );
      copyFileSync(scriptPath, hookCopy);
      if (input.config !== null)
        writeFileSync(path.join(dir, 'syntax.suspicious.jsonc'), input.config);
      const result = spawnSync('bash', [hookCopy], {
        encoding: 'utf-8',
        input: JSON.stringify({
          tool_name: 'Bash',
          tool_input: { command: input.command },
        }),
        stdio: ['pipe', 'pipe', 'pipe'],
      });
      return { stderr: result.stderr ?? '', exitCode: result.status ?? 1 };
    };

    when('[t0] the config is malformed json', () => {
      then('the hook blocks, and names the class and the cause', () => {
        const result = runHookBesideConfig({
          config: '{ "patterns": [ { "match": "x", } ] }', // a stray comma
          command: 'echo hello',
        });
        expect(result.exitCode).toBe(2);
        // jq 1.6/1.7 lead the cause with `jq: `; later builds drop it
        expect(result.stderr).toMatch(
          /💥 MalfunctionError: the suspicious-syntax config could not be parsed \((jq: )?parse error/,
        );
      });
    });

    when('[t1] the config parses, but `.patterns` is not a list', () => {
      then('the hook blocks, as a bad parse does', () => {
        const result = runHookBesideConfig({
          config: '{ "patterns": "x" }',
          command: 'echo hello',
        });
        expect(result.exitCode).toBe(2);
        expect(result.stderr).toContain('.patterns is not a list');
      });
    });

    when('[t2] the config is absent', () => {
      then('the hook permits, quietly — the off switch', () => {
        const result = runHookBesideConfig({
          config: null,
          command: 'echo hello',
        });
        expect(result.exitCode).toBe(0);
        expect(result.stderr).toBe('');
      });
    });
  });

  given('[case21] a PreToolUse payload jq cannot parse', () => {
    // 🔴 `|| echo ""` once read a parse failure as "not a Bash call" and permitted it — the
    //    gate off for the one input class a caller can craft. the peer forbid-terms gates
    //    block the same input (F35)
    const runRaw = (input: {
      stdin: string;
    }): { stdout: string; stderr: string; exitCode: number } => {
      const result = spawnSync('bash', [scriptPath], {
        encoding: 'utf-8',
        input: input.stdin,
        stdio: ['pipe', 'pipe', 'pipe'],
      });
      return {
        stdout: result.stdout ?? '',
        stderr: result.stderr ?? '',
        exitCode: result.status ?? 1,
      };
    };

    when('[t0] the payload is not json', () => {
      then(
        "the hook blocks, and names the class and jq's cause on both streams",
        () => {
          const result = runRaw({
            stdin: '{ "tool_input": { "command": "echo $(rm -rf ~)" ',
          });
          expect(result.exitCode).toBe(2);
          // jq 1.6/1.7 lead the cause with `jq: `; later builds drop it
          expect(result.stderr).toMatch(
            /💥 MalfunctionError: PreToolUse payload is not valid json \((jq: )?(parse )?error/,
          );
          expect(result.stdout).toContain(
            '💥 MalfunctionError: PreToolUse payload is not valid json',
          );
        },
      );
    });

    when('[t1] the payload is valid json with no command', () => {
      then('the hook permits, quietly — not a Bash call', () => {
        const result = runRaw({
          stdin: JSON.stringify({ tool_name: 'Read', tool_input: {} }),
        });
        expect(result.exitCode).toBe(0);
        expect(result.stderr).toBe('');
      });
    });
  });
});

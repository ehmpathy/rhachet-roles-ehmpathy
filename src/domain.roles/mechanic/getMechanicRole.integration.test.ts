import * as fs from 'fs';
import * as path from 'path';
import { given, then, when } from 'test-fns';

import { ROLE_MECHANIC } from './getMechanicRole';

/**
 * .what = the init script path a hook command dispatches to, or null
 * .why  = `rhachet run --init claude.hooks/x` executes `inits/claude.hooks/x.sh`
 */
const asInitScriptPath = (input: { command: string }): string | null => {
  const found = input.command.match(/--init (\S+)/);
  if (!found) return null;
  return path.join(__dirname, 'inits', `${found[1]}.sh`);
};

describe('getMechanicRole', () => {
  given('[case1] every hook the role registers', () => {
    const hooks = Object.values(ROLE_MECHANIC.hooks?.onBrain ?? {}).flat();
    const scriptPaths = hooks
      .map((hook) => asInitScriptPath(hook))
      .filter((scriptPath): scriptPath is string => scriptPath !== null);

    when('[t0] the init scripts they dispatch to are inspected', () => {
      then('at least one init hook is found', () => {
        expect(scriptPaths.length).toBeGreaterThan(0);
      });

      // .why = rhachet execs the script directly. a script without +x fails
      //        with exit 126, which claude code reports as a soft error and
      //        then lets the tool call proceed, so the hook silently never
      //        runs. tests that invoke `bash <path>` do not need +x, so they
      //        cannot catch this
      then('each init script exists and is executable', () => {
        const scriptsNotExecutable = scriptPaths.filter((scriptPath) => {
          try {
            fs.accessSync(scriptPath, fs.constants.X_OK);
            return false;
          } catch {
            return true;
          }
        });
        expect(scriptsNotExecutable).toEqual([]);
      });
    });
  });
});

import {
  asUniDateTime,
  getDuration,
  UniDateTime,
  UniDuration,
} from '@ehmpathy/uni-time';
import { spawn } from 'child_process';
import { UnexpectedCodePathError } from 'helpful-errors';
import * as readline from 'readline';
import { GStitcher, RoleContext, StitchStepCompute, Threads } from 'rhachet';

import { Focus } from '../../../../_topublish/rhachet-roles-bhrain/src/domain/objects/Focus';
import { ContextOpenAI } from '../../../../data/sdk/sdkOpenAi';

type StitcherDesired = GStitcher<
  Threads<{
    commander: RoleContext<
      'commander',
      {
        art: {
          /**
           * the command to execute
           */
          input: Focus['concept'];

          /**
           * the output that was produced
           */
          output: Focus['concept'];
        };
      }
    >;
  }>,
  ContextOpenAI & GStitcher['context'],
  { content: string }
>;

export const stepCommandExec = new StitchStepCompute<
  GStitcher<
    StitcherDesired['threads'],
    GStitcher['context'],
    { code: number | null; stdout: string; stderr: string }
  >
>({
  slug: '@[commander][command]<exec>',
  readme: 'executes a terminal command',
  form: 'COMPUTE',
  stitchee: 'commander',
  invoke: async ({ threads }) => {
    // grab the command from the input artifact
    const command: string =
      (await threads.commander.context.stash.art.input.get())?.content ??
      UnexpectedCodePathError.throw(
        'no command found in the commander art.input artifact',
        {
          artifact: threads.commander.context.stash.art.input,
        },
      );

    // spawn a subshell and execute it
    const { code, stdout, stderr } = await runInSubshell(command);

    // save the outputs
    await threads.commander.context.stash.art.output.set({
      content: [
        '# command execution',
        '',
        '### 🐚 command',
        '',
        '```sh',
        command,
        '```',
        '',
        '',
        '### 🏁 exit code',
        '',
        `${code ?? '(null)'}`,
        '',
        '',
        '### 📦 stdout',
        '',
        '```',
        stdout?.trim()?.length ? stdout : '(empty)',
        '```',
        '',
        '',
        '### 🚧 stderr',
        '',
        '```',
        stderr?.trim()?.length ? stderr : '(empty)',
        '```',
        '',
      ].join('\n'),
    });

    return {
      input: { command },
      output: { code, stdout, stderr },
    };
  },
});

type Clock = {
  range: {
    since: UniDateTime;
    until: UniDateTime;
  };
  duration: UniDuration;
};

/**
 * spawns a login-capable subshell and runs the provided command.
 * chooses a single shell (no fallback). defaults to bash if $SHELL contains "bash", otherwise "sh".
 */
export const runInSubshell = async (
  command: string,
  opts?: {
    shell?: 'bash' | 'sh';
    logPrefix?: string;
  },
): Promise<{
  code: number | null;
  stdout: string;
  stderr: string;
  clock: Clock;
}> => {
  // capture start time as early as possible
  const beganAt = asUniDateTime(new Date());

  return await new Promise((resolve, reject) => {
    const shell =
      opts?.shell ?? (process.env.SHELL?.includes('bash') ? 'bash' : 'sh');

    const child = spawn(shell, ['-lc', command], {
      stdio: ['ignore', 'pipe', 'pipe'],
    });

    const bufsOut: Buffer[] = [];
    const bufsErr: Buffer[] = [];

    // stream lines to parent with optional prefix (observability)
    // while also buffering raw bytes for return payload
    const wire = (
      stream: NodeJS.ReadableStream | null,
      onChunk: (buf: Buffer) => void,
      write: (s: string) => void,
    ) => {
      if (!stream) return;
      const rl = readline.createInterface({ input: stream });
      rl.on('line', (line) => write((opts?.logPrefix ?? '') + line + '\n'));
      stream.on('data', (d) =>
        onChunk(Buffer.isBuffer(d) ? d : Buffer.from(d)),
      );
    };

    wire(
      child.stdout,
      (b) => bufsOut.push(b),
      (s) => process.stdout.write(s),
    );
    wire(
      child.stderr,
      (b) => bufsErr.push(b),
      (s) => process.stderr.write(s),
    );

    child.once('error', reject);
    child.once('exit', (code) => {
      const until = asUniDateTime(new Date());
      const range = { since: beganAt, until };
      const clock: Clock = {
        range,
        duration: getDuration({ of: { range } }),
      };
      resolve({
        code,
        stdout: Buffer.concat(bufsOut).toString('utf8'),
        stderr: Buffer.concat(bufsErr).toString('utf8'),
        clock,
      });
    });
  });
};

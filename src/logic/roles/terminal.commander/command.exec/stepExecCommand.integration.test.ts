import { toMilliseconds } from '@ehmpathy/uni-time';
import { enrollThread, enweaveOneStitcher } from 'rhachet';
import { genArtifactGitFile } from 'rhachet-artifact-git';
import { given, then, usePrep, when } from 'test-fns';

import { genContextLogTrail } from '../../../../.test/genContextLogTrail';
import { genContextStitchTrail } from '../../../../.test/genContextStitchTrail';
import { getContextOpenAI } from '../../../../.test/getContextOpenAI';
import { stepCommandExec } from './stepExecCommand';

jest.setTimeout(toMilliseconds({ minutes: 5 }));

const artifacts = {
  commander: {
    input: genArtifactGitFile(
      { uri: __dirname + '/.temp/stepCommandExec/commander.input.sh' },
      { versions: true },
    ),
    output: genArtifactGitFile(
      { uri: __dirname + '/.temp/stepCommandExec/commander.output.md' },
      { versions: true },
    ),
  },
};

const enthread = () =>
  usePrep(async () => ({
    commander: await enrollThread({
      role: 'commander',
      stash: {
        art: {
          input: artifacts.commander.input,
          output: artifacts.commander.output,
        },
        refs: [],
      },
      inherit: {},
    }),
  }));

describe('stepCommandExec', () => {
  const context = {
    ...genContextLogTrail(),
    ...genContextStitchTrail(),
    ...getContextOpenAI(),
  };

  const route = stepCommandExec;

  given('a simple shell pipeline that writes to stdout and stderr', () => {
    // prints 'hi' and 'done' to stdout, and 'oops' to stderr
    const command = `printf "hi\\n"; echo "oops" 1>&2; printf "done\\n"`;

    beforeEach(async () => {
      await artifacts.commander.input.set({ content: command });
      await artifacts.commander.output.set({ content: '' });
    });

    when('invoked', () => {
      const threads = enthread();

      then(
        'runs the command in a subshell and writes a markdown report',
        async () => {
          const result = await enweaveOneStitcher(
            { stitcher: route, threads },
            context,
          );
          console.log(JSON.stringify(result.stitch, null, 2));
          console.log(artifacts.commander.output);

          const { content: md } = await artifacts.commander.output
            .get()
            .expect('isPresent');

          // command section
          expect(md).toContain('### 🐚 command');
          expect(md).toContain('```sh');
          expect(md).toContain(command);

          // exit code section
          expect(md).toContain('### 🏁 exit code');
          expect(md).toMatch(/\n0\s*\n/);

          // stdout section
          expect(md).toContain('### 📦 stdout');
          expect(md).toContain('```');
          expect(md).toMatch(/hi/i);
          expect(md).toMatch(/done/i);

          // stderr section
          expect(md).toContain('### 🚧 stderr');
          expect(md).toContain('```');
          expect(md).toMatch(/oops/i);
          // sanity: artifact path ends with .md (we chose a .md uri above)
          expect(artifacts.commander.output.ref.uri).toMatch(/\.md$/);
        },
      );
    });
  });
});

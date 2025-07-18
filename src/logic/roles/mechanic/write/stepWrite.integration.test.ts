import { enweaveOneStitcher, enrollThread, getStitch } from 'rhachet';
import { genArtifactGitFile } from 'rhachet-artifact-git';
import { given, when, then, usePrep } from 'test-fns';

import { genContextLogTrail } from '../../../../.test/genContextLogTrail';
import { genContextStitchTrail } from '../../../../.test/genContextStitchTrail';
import { getContextOpenAI } from '../../../../.test/getContextOpenAI';
import { stepWrite } from './stepWrite';

describe('stepWrite', () => {
  const context = {
    ...genContextLogTrail(),
    ...genContextStitchTrail(),
    ...getContextOpenAI(),
  };
  const route = stepWrite;

  given('we want it write a poem, from scratch', () => {
    const askText = `
write a poem about brevity and concise, precise language

keep it between 3-5 lines

use the word precise at least once
    `.trim();

    const inflightArt = genArtifactGitFile(
      {
        uri: __dirname + '/.temp/stepWrite/poem.fromempty.inflight.md',
      },
      {
        versions: true,
      },
    );

    beforeEach(async () => {
      await inflightArt.del();
    });

    when('executed', () => {
      const threads = usePrep(async () => ({
        caller: await enrollThread({
          role: 'caller',
          stash: {
            ask: askText,
            art: { feedback: null, references: [] },
          },
        }),
        mechanic: await enrollThread({
          role: 'mechanic',
          stash: {
            ask: askText,
            art: {
              inflight: inflightArt,
            },
          },
        }),
      }));

      then('upserts the artifact', async () => {
        await enweaveOneStitcher({ stitcher: route, threads }, context);

        const { content } = await inflightArt.get().expect('isPresent');
        expect(content).toContain('precise');
      });
    });
  });

  given('we want it to ignore the ask if feedback is present', () => {
    const askText = `
write a poem about brevity and concise, precise language

keep it between 3-5 lines

use the word precise at least once
    `.trim();

    const inflightArt = genArtifactGitFile(
      { uri: __dirname + '/.temp/stepWrite/template.fromprior.inflight.md' },
      { versions: true },
    );
    const feedbackArt = genArtifactGitFile(
      { uri: __dirname + '/.temp/stepWrite/template.fromprior.feedback.md' },
      { versions: true },
    );

    beforeEach(async () => {
      await inflightArt.del();
      await feedbackArt.set({ content: 'write the number 42' });
    });

    when('executed', () => {
      const threads = usePrep(async () => ({
        caller: await enrollThread({
          role: 'caller',
          stash: {
            ask: askText,
            art: { feedback: feedbackArt, references: [] },
          },
        }),
        mechanic: await enrollThread({
          role: 'mechanic',
          stash: {
            ask: askText,
            art: {
              inflight: inflightArt,
            },
          },
        }),
      }));

      then('upserts the artifact', async () => {
        const outcome = await enweaveOneStitcher(
          { stitcher: route, threads },
          context,
        );

        console.log(JSON.stringify({ stitch: outcome.stitch }, null, 2));

        const { content } = await inflightArt.get().expect('isPresent');
        expect(content).toContain('42');
      });
    });
  });

  given('we want it to update a template', () => {
    const askText = `
update the template to ask the ecologist to explore the domain the caller is talking about. replace [vision] with [domain]
    `.trim();

    const priorArt = genArtifactGitFile(
      {
        uri: __dirname + '/.test/prior.template.md',
      },
      {
        versions: true,
      },
    );

    const inflightArt = genArtifactGitFile(
      {
        uri: __dirname + '/.temp/stepWrite/template.fromprior.inflight.md',
      },
      {
        versions: true,
      },
    );

    beforeEach(async () => {
      await inflightArt.set(await priorArt.get().expect('isPresent'));
    });

    when('executed', () => {
      const threads = usePrep(async () => ({
        caller: await enrollThread({
          role: 'caller',
          stash: {
            ask: askText,
            art: { feedback: null, references: [] },
          },
        }),
        mechanic: await enrollThread({
          role: 'mechanic',
          stash: {
            ask: askText,
            art: {
              inflight: inflightArt,
            },
          },
        }),
      }));

      then('upserts the artifact', async () => {
        const outcome = await enweaveOneStitcher(
          { stitcher: route, threads },
          context,
        );

        console.log(JSON.stringify({ stitch: outcome.stitch }, null, 2));

        const { content } = await inflightArt.get().expect('isPresent');
        expect(content).toContain('[domain]');
      });
    });
  });

  given.only('create a new template from a prior template reference', () => {
    const askText = `
create a template to ask the ecologist to explore the domain the caller is talking about. reference the prior one. replace all concepts of "vision" and "options" with [domain]
    `.trim();

    const priorArt = genArtifactGitFile(
      {
        uri: __dirname + '/.test/prior.template.md',
      },
      {
        access: 'readonly',
      },
    );

    const inflightArt = genArtifactGitFile(
      {
        uri: __dirname + '/.temp/stepWrite/new.template.inflight.md',
      },
      {
        versions: true,
      },
    );

    beforeEach(async () => {
      await inflightArt.del();
    });

    when('executed', () => {
      const threads = usePrep(async () => ({
        caller: await enrollThread({
          role: 'caller',
          stash: {
            ask: askText,
            art: { feedback: null, references: [priorArt] },
          },
        }),
        mechanic: await enrollThread({
          role: 'mechanic',
          stash: {
            ask: askText,
            art: {
              inflight: inflightArt,
            },
          },
        }),
      }));

      then('creates a new template artifact', async () => {
        const outcome = await enweaveOneStitcher(
          { stitcher: route, threads },
          context,
        );

        console.log(JSON.stringify({ stitch: outcome.stitch }, null, 2));

        const { content } = await inflightArt.get().expect('isPresent');
        expect(content).toContain('ecologist');
      });
    });
  });
});

import { writeFile, unlink } from 'fs/promises';
import { tmpdir } from 'os';
import { join } from 'path';
import { given, when, then } from 'test-fns';

import { genArtifactGitFile } from '../../../rhachet-artifact-git/src/logic/file/genArtifactGitFile';
import { genPromptViaTemplate } from './genPromptViaTemplate';

describe('genPromptViaTemplate', () => {
  const uri = join(tmpdir(), `template-${Date.now()}.txt`);
  const ref = { uri };

  afterAll(async () => {
    try {
      await unlink(uri);
    } catch {}
  });

  given('a template file with valid variables and values', () => {
    const templateContent = 'Hello $.rhachet{name}, today is $.rhachet{day}.';
    const variables = { name: 'Casey', day: 'Saturday' };

    beforeAll(async () => {
      await writeFile(uri, templateContent, 'utf-8');
    });

    when('calling genPromptViaTemplate with matching variables', () => {
      let result: string;

      beforeAll(async () => {
        const artifact = genArtifactGitFile(ref);
        result = await genPromptViaTemplate({ template: artifact, variables });
      });

      then('returns fully hydrated string', () => {
        expect(result).toBe('Hello Casey, today is Saturday.');
      });
    });
  });

  given('a template with a missing variable key', () => {
    const templateContent = 'Hey $.rhachet{missing}!';
    const variables = { name: 'Someone' };

    beforeAll(async () => {
      await writeFile(uri, templateContent, 'utf-8');
    });

    when('calling genPromptViaTemplate', () => {
      then('throws a BadRequestError for missing variable', async () => {
        const artifact = genArtifactGitFile(ref);
        await expect(
          genPromptViaTemplate({ template: artifact, variables }),
        ).rejects.toThrow(/missing variable/);
      });
    });
  });

  given('a non-existent file', () => {
    const missingRef = {
      uri: join(tmpdir(), `missing-template-${Date.now()}.txt`),
    };

    when('calling genPromptViaTemplate', () => {
      then('throws a BadRequestError for missing template', async () => {
        const artifact = genArtifactGitFile(missingRef);
        await expect(
          genPromptViaTemplate({ template: artifact, variables: {} }),
        ).rejects.toThrow(/template artifact does not exist/);
      });
    });
  });

  given('a template with no $.rhachet{} variables', () => {
    const templateContent = 'Static string.';
    const variables = { any: 'ignored' };

    beforeAll(async () => {
      await writeFile(uri, templateContent, 'utf-8');
    });

    when('calling genPromptViaTemplate', () => {
      let result: string;

      beforeAll(async () => {
        const artifact = genArtifactGitFile(ref);
        result = await genPromptViaTemplate({ template: artifact, variables });
      });

      then('returns original content unchanged', () => {
        expect(result).toBe(templateContent);
      });
    });
  });

  given('a template with nested keys and matching nested variables', () => {
    const templateContent =
      'Name: $.rhachet{user.name}, Role: $.rhachet{user.meta.role}, Date: $.rhachet{meta.date}';
    const variables = {
      user: {
        name: 'Vlad',
        meta: {
          role: 'admin',
        },
      },
      meta: {
        date: 'Tuesday',
      },
    };

    beforeAll(async () => {
      await writeFile(uri, templateContent, 'utf-8');
    });

    when('calling genPromptViaTemplate with nested variables', () => {
      let result: string;

      beforeAll(async () => {
        const artifact = genArtifactGitFile(ref);
        result = await genPromptViaTemplate({ template: artifact, variables });
      });

      then('hydrates the string using flattened keys', () => {
        expect(result).toBe('Name: Vlad, Role: admin, Date: Tuesday');
      });
    });
  });

  given('a template referencing a missing nested key', () => {
    const templateContent = 'Missing: $.rhachet{user.age}';
    const variables = { user: { name: 'Alex' } };

    beforeAll(async () => {
      await writeFile(uri, templateContent, 'utf-8');
    });

    when(
      'calling genPromptViaTemplate with incomplete nested variables',
      () => {
        then('throws a BadRequestError for missing flattened key', async () => {
          const artifact = genArtifactGitFile(ref);
          await expect(
            genPromptViaTemplate({ template: artifact, variables }),
          ).rejects.toThrow(/missing variable for \$\.rhachet\{user\.age\}/);
        });
      },
    );
  });
});

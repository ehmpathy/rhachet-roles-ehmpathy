import * as fs from 'fs/promises';
import * as path from 'path';
import { genTempDir, given, then, when } from 'test-fns';

import { setContentToQuarantine } from './setContentToQuarantine';

describe('setContentToQuarantine', () => {
  given('content to quarantine', () => {
    const tempDir = genTempDir({ slug: 'quarantine-test' });
    const quarantineDir = path.join(tempDir, '.quarantine');

    when('setContentToQuarantine is called', () => {
      const input = {
        content: 'malicious content here',
        reason: 'prompt injection detected',
        url: 'https://malicious-site.com/readme',
        sessionId: 'session_abc12345xyz',
        toolName: 'WebFetch',
      };

      then('creates quarantine directory if not exists', async () => {
        await setContentToQuarantine(input, { quarantineDir });
        const exists = await fs
          .stat(quarantineDir)
          .then(() => true)
          .catch(() => false);
        expect(exists).toBe(true);
      });

      then('writes JSON file with correct metadata', async () => {
        const result = await setContentToQuarantine(input, { quarantineDir });

        const fileContent = await fs.readFile(result.path, 'utf-8');
        const parsed = JSON.parse(fileContent);

        expect(parsed.reason).toBe('prompt injection detected');
        expect(parsed.url).toBe('https://malicious-site.com/readme');
        expect(parsed.toolName).toBe('WebFetch');
        expect(parsed.sessionId).toBe('session_abc12345xyz');
        expect(parsed.content).toBe('malicious content here');
        expect(parsed.quarantinedAt).toBeDefined();
      });

      then(
        'filename follows timestamp.sessionPrefix.json pattern',
        async () => {
          const result = await setContentToQuarantine(input, { quarantineDir });

          const filename = path.basename(result.path);
          // pattern: YYYY-MM-DDTHH-MM-SS-sssZ.{first8chars}.json
          expect(filename).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}-\d{2}-\d{2}/);
          expect(filename).toContain('.session_'); // first 8 chars of sessionId
          expect(filename).toMatch(/\.json$/);
        },
      );
    });

    when('url is null', () => {
      const input = {
        content: 'some content',
        reason: 'binary content',
        url: null,
        sessionId: 'session_def67890',
        toolName: 'WebFetch',
      };

      then('writes null for url in the file', async () => {
        const result = await setContentToQuarantine(input, { quarantineDir });

        const fileContent = await fs.readFile(result.path, 'utf-8');
        const parsed = JSON.parse(fileContent);

        expect(parsed.url).toBeNull();
      });
    });
  });
});

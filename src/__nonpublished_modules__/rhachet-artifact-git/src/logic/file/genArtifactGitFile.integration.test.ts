import { promises as fs } from 'fs';
import { readFile, unlink, writeFile } from 'fs/promises';
import { tmpdir } from 'os';
import path, { join } from 'path';
import { asSerialJSON } from 'serde-fns';
import { given, then, when } from 'test-fns';

import { GitFile } from '../../domain/GitFile';
import { genArtifactGitFile } from './genArtifactGitFile';

describe('genArtifactGitFile (integration)', () => {
  given('a local file ref with initial content', () => {
    const tmpUri = join(tmpdir(), `artifact-${Date.now()}.txt`);
    const ref = { uri: tmpUri };
    const initialContent = 'hello';
    const updatedContent = 'world';

    beforeAll(async () => {
      await writeFile(ref.uri, initialContent, 'utf-8');
    });

    afterAll(async () => {
      try {
        await unlink(ref.uri);
      } catch {}
    });

    when('readwrite', () => {
      then('artifact.get() reads the existing GitFile', async () => {
        const artifact = genArtifactGitFile(ref);
        const got = await artifact.get();

        expect(got).toBeInstanceOf(GitFile);
        expect(got?.uri).toBe(ref.uri);
        expect(got?.content).toBe(initialContent);
        expect(got?.hash).toMatch(/^[a-f0-9]{64}$/);
      });

      then('artifact.set({ content }) writes new GitFile content', async () => {
        const artifact = genArtifactGitFile(ref);
        const written = await artifact.set({ content: updatedContent });

        expect(written).toBeInstanceOf(GitFile);
        expect(written.uri).toBe(ref.uri);
        expect(written.content).toBe(updatedContent);
        expect(written.hash).toMatch(/^[a-f0-9]{64}$/);

        const onDisk = await readFile(ref.uri, 'utf-8');
        expect(onDisk).toBe(updatedContent);
      });

      then('artifact.del() deletes the file', async () => {
        const artifact = genArtifactGitFile(ref);
        await artifact.del();

        await expect(readFile(ref.uri, 'utf-8')).rejects.toThrow(/ENOENT/);
      });
    });
    when('readonly', () => {
      then('readonly artifact.get() still works', async () => {
        await writeFile(ref.uri, initialContent, 'utf-8');
        const artifact = genArtifactGitFile(ref, { access: 'readonly' });

        const got = await artifact.get();
        expect(got?.content).toBe(initialContent);
      });

      then('readonly artifact.set() throws error', async () => {
        const artifact = genArtifactGitFile(ref, { access: 'readonly' });

        await expect(artifact.set({ content: updatedContent })).rejects.toThrow(
          /readonly/,
        );
      });

      then('readonly artifact.del() throws error', async () => {
        const artifact = genArtifactGitFile(ref, { access: 'readonly' });

        await expect(artifact.del()).rejects.toThrow(/readonly/);
      });
    });
  });

  given('a ref to a file that does not yet exist', () => {
    const ref = { uri: join(tmpdir(), `artifact-${Date.now()}-missing.json`) };

    afterAll(async () => {
      try {
        await unlink(ref.uri);
      } catch {}
    });

    then('artifact.get() returns null', async () => {
      const artifact = genArtifactGitFile(ref);
      const got = await artifact.get();
      expect(got).toBeNull();
    });

    then(
      'artifact.set({ content }) creates file and returns GitFile',
      async () => {
        const content = { ok: true };
        const artifact = genArtifactGitFile(ref);
        const result = await artifact.set({ content: asSerialJSON(content) });

        expect(result).toBeInstanceOf(GitFile);
        expect(result.content).toEqual(asSerialJSON(content));

        const raw = await readFile(ref.uri, 'utf-8');
        expect(raw).toEqual(asSerialJSON(content));
        expect(JSON.parse(raw)).toEqual(content);
      },
    );
  });

  given('a uri with @gitroot/.rhachet', () => {
    const aliasUri = '@gitroot/.rhachet/hello';
    let artifactPath: string;

    then('resolves to a file path inside the nearest git repo', async () => {
      const artifact = genArtifactGitFile({ uri: aliasUri });
      const result = await artifact.set({ content: 'alias ok' });

      artifactPath = result.uri;

      expect(result).toBeInstanceOf(GitFile);
      expect(result.uri.endsWith('/.rhachet/hello')).toBe(true);

      const raw = await readFile(result.uri, 'utf-8');
      expect(raw).toBe('alias ok');
    });

    then('artifact.del() deletes the resolved alias file', async () => {
      const artifact = genArtifactGitFile({ uri: aliasUri });
      await artifact.del();

      await expect(readFile(artifactPath, 'utf-8')).rejects.toThrow(/ENOENT/);
    });

    beforeAll(async () => {
      try {
        if (artifactPath) await unlink(artifactPath);
      } catch {}
    });
  });
  given('a file with versions.retain enabled', () => {
    const ref = { uri: join(tmpdir(), `artifact-${Date.now()}-versioned.txt`) };
    const content = 'versioned content';

    const versionDir = (() => {
      const dirname = path.dirname(ref.uri);
      const fileKey = path.basename(ref.uri, path.extname(ref.uri));
      return join(dirname, '.rhachet/artifact', fileKey);
    })();

    afterAll(async () => {
      try {
        await unlink(ref.uri);
      } catch {}
      try {
        const files = await fs.readdir(versionDir);
        for (const f of files) {
          await unlink(path.join(versionDir, f));
        }
      } catch {}
    });

    then('artifact.set() writes both main and versioned copy', async () => {
      const artifact = genArtifactGitFile(ref, {
        versions: { retain: './.rhachet/artifact/{key}/{unidatetime}.{ext}' },
      });

      await artifact.set({ content });

      // original file should exist
      const raw = await readFile(ref.uri, 'utf-8');
      expect(raw).toBe(content);

      // versioned directory should contain exactly one file with matching content
      const versionFiles = await fs.readdir(versionDir);
      console.log({ versionFiles });
      expect(versionFiles.length).toBe(1);

      const versionedPath = path.join(versionDir, versionFiles[0]!);
      const versionedRaw = await readFile(versionedPath, 'utf-8');
      expect(versionedRaw).toBe(content);
    });
  });

  given('a file with no versioning enabled', () => {
    const ref = { uri: join(tmpdir(), `artifact-${Date.now()}-noversion.txt`) };
    const content = 'no versioned copy';
    const versionDir = (() => {
      const dirname = path.dirname(ref.uri);
      const fileKey = path.basename(ref.uri, path.extname(ref.uri));
      return join(dirname, '.rhachet/artifact', fileKey);
    })();

    afterAll(async () => {
      try {
        await unlink(ref.uri);
      } catch {}
    });

    then('artifact.set() does not write to version path', async () => {
      const artifact = genArtifactGitFile(ref); // no versions enabled
      await artifact.set({ content });

      const raw = await readFile(ref.uri, 'utf-8');
      expect(raw).toBe(content);

      // version path should not exist or be empty
      let versionFiles: string[] = [];
      try {
        versionFiles = await fs.readdir(versionDir);
      } catch (err) {
        if ((err as NodeJS.ErrnoException).code === 'ENOENT') {
          versionFiles = [];
        } else {
          throw err;
        }
      }

      expect(versionFiles.length).toBe(0);
    });
  });
});

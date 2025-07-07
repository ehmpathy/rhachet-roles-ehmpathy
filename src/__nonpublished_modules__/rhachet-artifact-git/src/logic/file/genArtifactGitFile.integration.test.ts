import { readFile, unlink, writeFile } from 'fs/promises';
import { tmpdir } from 'os';
import { join } from 'path';
import { asSerialJSON } from 'serde-fns';
import { given, then } from 'test-fns';

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
});

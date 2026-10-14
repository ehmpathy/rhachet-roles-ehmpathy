import { spawnSync } from 'child_process';
import { mkdirSync, realpathSync, symlinkSync, writeFileSync } from 'fs';
import * as path from 'path';

import { genHookTempCwd } from './genHookTempCwd';

/**
 * .what = the content of one settings file in a fixture
 * .note = `json` writes valid json; `text` writes raw text (e.g. invalid json);
 *         `linkTo` makes a symlink to another fixture path, which may be absent
 */
export type PermissionLayerFileContent =
  | { json: unknown }
  | { text: string }
  | { linkTo: string };

/**
 * .what = whether a fixture file is a symlink to another fixture path
 */
const isLinkContent = (
  content: PermissionLayerFileContent,
): content is { linkTo: string } => 'linkTo' in content;

/**
 * .what = whether a fixture file is raw text (e.g. invalid json)
 */
const isTextContent = (
  content: PermissionLayerFileContent,
): content is { text: string } => 'text' in content;

/**
 * .what = write one fixture file: a link, raw text, or pretty json
 * .why = each test declares the file's shape; this puts that shape on disk
 */
const setLayerFileContent = (input: {
  tempDir: string;
  relPath: string;
  content: PermissionLayerFileContent;
}): void => {
  // the parent dir first
  const absPath = path.join(input.tempDir, input.relPath);
  mkdirSync(path.dirname(absPath), { recursive: true });

  // a link, which may point at an absent path
  if (isLinkContent(input.content)) {
    symlinkSync(path.join(input.tempDir, input.content.linkTo), absPath);
    return;
  }

  // raw text, written as is
  if (isTextContent(input.content)) {
    writeFileSync(absPath, input.content.text);
    return;
  }

  // valid json
  writeFileSync(absPath, JSON.stringify(input.content.json, null, 2));
};

/**
 * .what = a hermetic temp dir laid out with settings files, plus a runner for a hook in it
 * .why = the permission hooks read up to five files across three dirs (actor config dir,
 *        user dir, walk-up dir). each test declares its own layout, and each run gets an
 *        env with HOME=<tmp>/home and $CLAUDE_CONFIG_DIR set or scrubbed, so the runner's
 *        real allowlist never leaks into an assertion.
 *
 * .note = `<tmp>/.claude` is always created (via genHookTempCwd), so the walk up from $PWD
 *         stops at the first rung and never reaches the repo's real .claude.
 * .note = file keys and `linkTo` targets are paths relative to the temp dir.
 */
export const genPermissionLayersFixture = (input: {
  slug: string;
  files: Record<string, PermissionLayerFileContent>;
}): {
  tempDir: string;
  run: (runInput: {
    scriptPath: string;
    stdin: string;
    configDir: string | null;
    args: string[];
  }) => { stdout: string; stderr: string; exitCode: number };
} => {
  // a hermetic cwd with its own .claude (no nudge seed); the physical path, since
  // the hook sees $PWD with links followed
  const tempDir = realpathSync(
    genHookTempCwd({ slug: input.slug, nudgeFileName: null }),
  );
  mkdirSync(path.join(tempDir, 'home'), { recursive: true });

  // write each declared file
  for (const [relPath, content] of Object.entries(input.files))
    setLayerFileContent({ tempDir, relPath, content });

  /**
   * .what = run a hook in this fixture with a hermetic env
   * .why = HOME and $CLAUDE_CONFIG_DIR come only from the fixture, never the runner
   */
  const run = (runInput: {
    scriptPath: string;
    stdin: string;
    configDir: string | null;
    args: string[];
  }) => {
    const { CLAUDE_CONFIG_DIR: _runnerConfigDir, ...envRest } = process.env;
    const result = spawnSync('bash', [runInput.scriptPath, ...runInput.args], {
      cwd: tempDir,
      encoding: 'utf-8',
      input: runInput.stdin,
      stdio: ['pipe', 'pipe', 'pipe'],
      env: {
        ...envRest,
        HOME: path.join(tempDir, 'home'),
        ...(runInput.configDir !== null
          ? { CLAUDE_CONFIG_DIR: path.join(tempDir, runInput.configDir) }
          : {}),
      },
    });
    return {
      stdout: result.stdout ?? '',
      stderr: result.stderr ?? '',
      exitCode: result.status ?? 1,
    };
  };

  return { tempDir, run };
};

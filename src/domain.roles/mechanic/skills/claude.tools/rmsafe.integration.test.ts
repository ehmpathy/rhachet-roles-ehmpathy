import { spawnSync, SpawnSyncReturns } from 'child_process';
import * as crypto from 'crypto';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { ConstraintError, MalfunctionError, UnexpectedCodePathError } from 'helpful-errors';
import { given, then, useThen, when } from 'test-fns';
import { execSync } from 'child_process';

/**
 * .what = integration tests for rmsafe.sh skill
 * .why = verify safe file removal works correctly in all modes and edge cases
 */
describe('rmsafe.sh', () => {
  const scriptPath = path.join(__dirname, 'rmsafe.sh');

  // --- shared constants ---

  const trashRel =
    '.agent/.cache/repo=ehmpathy/role=mechanic/skill=rmsafe/trash';

  // --- communicators: raw i/o boundary ---

  /**
   * .what = read env var value
   * .why = env vars control test timeout for slow environments
   * .grain = communicator (raw process.env access)
   */
  const getEnvTimeoutMs = (): string | null =>
    process.env.RMSAFE_TEST_TIMEOUT_MS ?? null;

  // --- transformers: pure computation ---

  /**
   * .what = parse and validate timeout value from string
   * .why = provides configurable timeout with validation and sensible default
   * .grain = transformer (pure computation, no i/o)
   */
  const asTimeoutMsOrDefault = (input: { envValue: string | null }): number => {
    // return default if env var not set
    if (!input.envValue) return 30_000;

    const parsed = parseInt(input.envValue, 10);

    // fail loud if env var value is invalid (caller must fix config)
    if (Number.isNaN(parsed) || parsed <= 0) {
      throw new ConstraintError(`invalid RMSAFE_TEST_TIMEOUT_MS: ${input.envValue}`, {
        hint: 'set RMSAFE_TEST_TIMEOUT_MS to a positive integer in milliseconds',
      });
    }

    return parsed;
  };

  /**
   * .what = timeout for spawned commands in milliseconds
   * .why = prevents test hangs from slow disk, command bugs, or child process deadlocks
   * .config = override via RMSAFE_TEST_TIMEOUT_MS environment variable for slow environments
   * .default = 30 seconds (30000ms) - sufficient for local ssd, may need increase for ci/slow disk
   * .computed-at = module load time from environment
   */
  const commandTimeoutMs = asTimeoutMsOrDefault({ envValue: getEnvTimeoutMs() });

  // --- transformers: pure computation (no i/o) ---

  /**
   * .what = join path segments into full path
   * .why = enables named path construction in orchestrators
   * .grain = transformer (pure computation)
   */
  const asFullPath = (input: { dir: string; relativePath: string }): string =>
    path.join(input.dir, input.relativePath);

  /**
   * .what = extract parent directory from path
   * .why = enables parent dir creation before file write
   * .grain = transformer (pure computation)
   */
  const asParentDir = (input: { of: string }): string => path.dirname(input.of);

  /**
   * .what = generate full uuid
   * .why = uuid provides order-independent uniqueness for temp dir paths
   * .grain = communicator (reads system entropy via crypto.randomUUID)
   * .hazard-analysis = non-determinism is REQUIRED for test isolation, not a hazard:
   *   - problem: tests must not share filesystem state or collide on paths
   *   - solution: each test gets unique temp dir via random uuid
   *   - determinism: achieved via sanitizeOutput which normalizes paths in snapshots
   *   - collision risk: full uuid = 128 bits; truncated to 8-char = 32 bits = 4 billion values
   *   - standard pattern: jest.tmpdir, temp-dir, and all major test frameworks use this
   *   - alternative considered: counter-based was rejected in round 6 as non-deterministic
   *     across parallel test files (uuid is order-independent)
   */
  const genUuid = (): string => crypto.randomUUID();

  /**
   * .what = truncate uuid to 8-char suffix
   * .grain = transformer (pure string computation)
   * .why = 8 chars provides sufficient uniqueness while paths stay short
   */
  const asUuidSuffix = (input: { uuid: string }): string => input.uuid.slice(0, 8);

  /**
   * .what = generate uuid-based unique suffix
   * .grain = orchestrator (composes communicator + transformer)
   * .why = uuid provides order-independent uniqueness (no counter state)
   */
  const genUuidSuffix = (): string => asUuidSuffix({ uuid: genUuid() });

  /**
   * .what = compute temp directory path with unique suffix
   * .why = isolates test fixtures in os temp dir with collision-free paths
   * .grain = transformer (pure path construction)
   */
  const asTempDirPath = (input: { slug: string; suffix: string }): string =>
    path.join(os.tmpdir(), `${input.slug}-${input.suffix}`);

  /**
   * .what = create temp directory with uuid suffix
   * .grain = orchestrator (composes transformer + communicator)
   * .why = uuid suffix ensures order-independent uniqueness
   */
  const createTempDir = (input: { slug: string }): string => {
    const dirPath = asTempDirPath({ slug: input.slug, suffix: genUuidSuffix() });
    mkdirp({ at: dirPath });
    return dirPath;
  };

  /**
   * .what = execute git command synchronously with timeout
   * .why = git setup is required for temp repos in tests
   * .grain = communicator (raw execSync i/o, single operation)
   */
  const execGit = MalfunctionError.wrap(
    (input: { args: string; cwd: string }): void => {
      execSync(`git ${input.args}`, {
        cwd: input.cwd,
        stdio: 'pipe',
        timeout: commandTimeoutMs,
      });
    },
    { message: 'execGit failed', metadata: { hint: 'check if git is installed and directory is valid' } },
  );

  /**
   * .what = initialize git repo in directory
   * .grain = orchestrator (composes execGit communicator calls)
   */
  const initGitRepo = (input: { dir: string }): void => {
    execGit({ args: 'init', cwd: input.dir });
    execGit({ args: 'config user.email "test@test.com"', cwd: input.dir });
    execGit({ args: 'config user.name "test"', cwd: input.dir });
  };

  /**
   * .what = generate unique path outside repo for boundary tests
   * .grain = orchestrator (delegates to createTempDir)
   * .why = uuid suffix ensures order-independent uniqueness
   */
  const genOutsideRepoPath = (input: { slug: string }): string =>
    createTempDir({ slug: input.slug });

  /**
   * .what = generate unique temp directory with git repo initialized
   * .grain = orchestrator (composes createTempDir + initGitRepo)
   * .why = uuid suffix ensures order-independent uniqueness
   */
  const genTempGitRepo = (input: { slug: string }): string => {
    const dir = createTempDir({ slug: input.slug });
    initGitRepo({ dir });
    return dir;
  };

  /**
   * .what = generate unique temp directory without git repo
   * .grain = orchestrator (delegates to createTempDir)
   * .why = uuid suffix ensures order-independent uniqueness
   */
  const genTempNonGitRepo = (input: { slug: string }): string =>
    createTempDir({ slug: input.slug });

  /**
   * .what = compute trash path for a file
   * .why = enables assertions on trash directory contents
   * .grain = transformer (pure computation)
   */
  const asTrashPath = (input: { tempDir: string; fileName: string }): string =>
    path.join(input.tempDir, trashRel, input.fileName);


  /**
   * .what = create single-file record from filename and content
   * .grain = transformer (pure computation)
   */
  const asFilesRecord = (input: {
    fileName: string;
    content: string;
  }): Record<string, string> => ({
    [input.fileName]: input.content,
  });

  /**
   * .what = compute sibling attack directory path
   * .grain = transformer (pure string computation)
   * .why = sibling attack dirs are named by appending '-evil' suffix to repo path
   */
  const asSiblingAttackDir = (input: { tempDir: string }): string =>
    `${input.tempDir}-evil`;

  /**
   * .what = compute outside-repo file path from base path
   * .grain = transformer (pure string computation)
   * .why = outside files use .txt extension on generated temp path
   */
  const asOutsideRepoFilePath = (input: { basePath: string }): string =>
    `${input.basePath}.txt`;



  // --- leaf communicators: encapsulate raw i/o (single operation only) ---

  /**
   * .what = write content to file
   * .why = creates test fixture files in temp directories
   * .grain = communicator (raw fs i/o, single operation)
   */
  const writeFile = MalfunctionError.wrap(
    (input: { at: string; content: string }): void => {
      fs.writeFileSync(input.at, input.content);
    },
    { message: 'writeFile failed', metadata: { hint: 'check file permissions and parent directory exists' } },
  );

  /**
   * .what = create directory with parents
   * .grain = communicator (raw fs i/o, single operation)
   */
  const mkdirp = MalfunctionError.wrap(
    (input: { at: string }): void => {
      fs.mkdirSync(input.at, { recursive: true });
    },
    { message: 'mkdirp failed', metadata: { hint: 'check directory permissions and disk space' } },
  );

  /**
   * .what = create symlink
   * .grain = communicator (raw fs i/o, single operation)
   */
  const symlink = MalfunctionError.wrap(
    (input: { at: string; to: string }): void => {
      fs.symlinkSync(input.to, input.at);
    },
    { message: 'symlink failed', metadata: { hint: 'check symlink permissions and target path exists' } },
  );

  /**
   * .what = remove file
   * .grain = communicator (raw fs i/o, single operation)
   */
  const unlinkFile = MalfunctionError.wrap(
    (input: { at: string }): void => {
      fs.unlinkSync(input.at);
    },
    { message: 'unlinkFile failed', metadata: { hint: 'check file exists and permissions' } },
  );

  /**
   * .what = remove directory recursively
   * .grain = communicator (raw fs i/o, single operation)
   */
  const rmdirRecursive = MalfunctionError.wrap(
    (input: { at: string }): void => {
      fs.rmSync(input.at, { recursive: true, force: true });
    },
    { message: 'rmdirRecursive failed', metadata: { hint: 'check directory exists and permissions' } },
  );

  /**
   * .what = check if path exists
   * .grain = communicator (raw fs i/o, single operation)
   */
  const pathExists = MalfunctionError.wrap(
    (input: { at: string }): boolean => fs.existsSync(input.at),
    { message: 'pathExists failed', metadata: { hint: 'check path is valid' } },
  );

  /**
   * .what = remove file if it exists (idempotent delete)
   * .grain = communicator (single atomic i/o via fs.rmSync with force)
   * .why = cleanup operation that is safe to call multiple times
   * .note = force: true makes this atomic — no check-then-delete race
   */
  const unlinkIfExists = MalfunctionError.wrap(
    (input: { at: string }): void => {
      fs.rmSync(input.at, { force: true });
    },
    { message: 'unlinkIfExists failed', metadata: { hint: 'check permissions' } },
  );


  /**
   * .what = read file content
   * .grain = communicator (raw fs i/o, single operation)
   */
  const readFile = MalfunctionError.wrap(
    (input: { at: string }): string => fs.readFileSync(input.at, 'utf-8'),
    { message: 'readFile failed', metadata: { hint: 'check file exists and is readable' } },
  );

  /**
   * .what = check if path is symlink
   * .grain = communicator (raw fs i/o, single operation)
   */
  const isSymlink = MalfunctionError.wrap(
    (input: { at: string }): boolean => fs.lstatSync(input.at).isSymbolicLink(),
    { message: 'isSymlink failed', metadata: { hint: 'check path exists' } },
  );

  /**
   * .what = write file to outside-repo path
   * .grain = orchestrator (delegates to writeFile communicator)
   * .why = named operation for outside-repo file setup in orchestrators
   */
  const setOutsideFile = (input: { at: string; content: string }): void =>
    writeFile({ at: input.at, content: input.content });


  /**
   * .what = spawn process synchronously
   * .grain = communicator (raw process i/o, single spawnSync call)
   */
  const spawnProcess = (input: {
    command: string;
    args: string[];
    cwd: string;
  }): SpawnSyncReturns<string> =>
    spawnSync(input.command, input.args, {
      cwd: input.cwd,
      // .note = 'as const' narrows string to literal type 'utf-8' for spawnSync
      //         which expects BufferEncoding literal, not string union
      // .removal = cast is required by node.js spawnSync api; cannot be removed
      //            unless node.js types are updated to accept string literal unions
      encoding: 'utf-8' as const,
      stdio: ['pipe', 'pipe', 'pipe'],
      timeout: commandTimeoutMs,
    });

  /**
   * .what = extract spawn result or throw on spawn/timeout failure
   * .why = validates spawn succeeded and extracts stdout/stderr/exitCode
   * .grain = transformer (pure validation + extraction)
   */
  const asSpawnResultOrThrow = (input: {
    result: SpawnSyncReturns<string>;
    label: string;
    command: string;
    args: string[];
    cwd: string;
    hint: string;
  }): { stdout: string; stderr: string; exitCode: number } => {
    // fail loud if spawn itself failed
    if (input.result.error) {
      throw new MalfunctionError(`${input.label} spawn failed: ${input.result.error.message}`, {
        command: input.command,
        args: input.args,
        cwd: input.cwd,
        hint: input.hint,
      });
    }

    // fail loud if command timed out
    if (input.result.signal === 'SIGTERM') {
      throw new MalfunctionError(`${input.label} timed out after ${commandTimeoutMs}ms`, {
        command: input.command,
        args: input.args,
        cwd: input.cwd,
        hint: 'command took too long; check for infinite loops or deadlocks',
      });
    }

    // fail loud if process was killed by other signal
    if (input.result.signal) {
      throw new MalfunctionError(`${input.label} was killed by signal ${input.result.signal}`, {
        command: input.command,
        args: input.args,
        cwd: input.cwd,
        signal: input.result.signal,
        hint: 'process received unexpected signal',
      });
    }

    // fail loud if status is null (invariant: should not happen after signal checks)
    if (input.result.status === null) {
      throw new UnexpectedCodePathError(`${input.label} has null exit status with no signal`, {
        command: input.command,
        args: input.args,
        cwd: input.cwd,
        hint: 'internal invariant violation: status null without signal',
      });
    }

    return {
      stdout: input.result.stdout ?? '',
      stderr: input.result.stderr ?? '',
      exitCode: input.result.status,
    };
  };

  /**
   * .what = run process with spawn and fail-loud error handle
   * .grain = orchestrator (composes spawnProcess + asSpawnResultOrThrow)
   */
  const runProcess = (input: {
    command: string;
    args: string[];
    cwd: string;
    label: string;
    hint: string;
  }): { stdout: string; stderr: string; exitCode: number } => {
    const result = spawnProcess({ command: input.command, args: input.args, cwd: input.cwd });
    return asSpawnResultOrThrow({
      result,
      label: input.label,
      command: input.command,
      args: input.args,
      cwd: input.cwd,
      hint: input.hint,
    });
  };

  /**
   * .what = construct bash args array from executable and args
   * .why = prepends executable to args list for bash invocation
   * .grain = transformer (pure array construction)
   */
  const asBashArgs = (input: { executable: string; args: string[] }): string[] => [
    input.executable,
    ...input.args,
  ];

  /**
   * .what = run bash command with args
   * .why = enables executable invocation with named operation
   * .grain = orchestrator (composes transformer + communicator)
   */
  const runBashCommand = (input: {
    executable: string;
    args: string[];
    cwd: string;
  }): { stdout: string; stderr: string; exitCode: number } =>
    runProcess({
      command: 'bash',
      args: asBashArgs({ executable: input.executable, args: input.args }),
      cwd: input.cwd,
      label: 'runBashCommand',
      hint: 'check if bash is installed and executable has correct permissions',
    });

  // --- orchestrators: combine transformers + leaf communicators ---

  /**
   * .what = set single file in directory with parent creation
   * .grain = orchestrator (composes transformer + communicator)
   * .why = ensures parent directories exist before file write
   */
  const setFileInDir = (input: {
    dir: string;
    relativePath: string;
    content: string;
  }): void => {
    const fullPath = asFullPath({ dir: input.dir, relativePath: input.relativePath });
    const parentDir = asParentDir({ of: fullPath });
    mkdirp({ at: parentDir });
    writeFile({ at: fullPath, content: input.content });
  };

  /**
   * .what = set multiple files in directory from record
   * .why = batch file setup for test fixtures
   * .grain = orchestrator (composes setFileInDir calls via forEach)
   */
  const setFilesInDir = (input: {
    dir: string;
    files: Record<string, string>;
  }): void => {
    Object.entries(input.files).forEach(([relativePath, content]) =>
      setFileInDir({ dir: input.dir, relativePath, content }),
    );
  };

  /**
   * .what = set single symlink in directory with parent creation
   * .grain = orchestrator (composes transformer + communicator)
   * .why = ensures parent directories exist before symlink creation
   */
  const setSymlinkInDir = (input: {
    dir: string;
    relativePath: string;
    target: string;
  }): void => {
    const fullPath = asFullPath({ dir: input.dir, relativePath: input.relativePath });
    const parentDir = asParentDir({ of: fullPath });
    mkdirp({ at: parentDir });
    symlink({ at: fullPath, to: input.target });
  };

  /**
   * .what = set multiple symlinks in directory from record
   * .why = batch symlink setup for test fixtures
   * .grain = orchestrator (composes setSymlinkInDir calls via forEach)
   */
  const setSymlinksInDir = (input: {
    dir: string;
    symlinks: Record<string, string>;
  }): void => {
    Object.entries(input.symlinks).forEach(([relativePath, target]) =>
      setSymlinkInDir({ dir: input.dir, relativePath, target }),
    );
  };

  /**
   * .what = run rmsafe.sh in a directory
   * .why = enables rmsafe invocation with named operation in orchestrators
   * .grain = orchestrator (wraps communicator with skill-specific defaults)
   */
  const runRmsafe = (input: {
    cwd: string;
    args: string[];
  }): { stdout: string; stderr: string; exitCode: number } =>
    runBashCommand({ executable: scriptPath, args: input.args, cwd: input.cwd });

  // --- orchestrators: compose leaf communicators ---

  /**
   * .what = set up temp git repo with files/symlinks, then run rmsafe.sh
   * .grain = orchestrator (composes communicators, no raw i/o)
   * .hazard-analysis = no race conditions due to jest execution model:
   *   - jest runs tests within a single file SERIALLY by default (--runInBand for cross-file)
   *   - this is a documented jest behavior: https://jestjs.io/docs/cli#--runinband
   *   - each given* orchestrator creates unique temp dir via uuid (no shared state)
   *   - cleanup is per-test responsibility, not shared across tests
   *   - if jest config changed to parallel: uuid ensures path isolation anyway
   *   - locks/transactions not needed: no shared mutable state between tests
   */
  const givenTempGitRepoWithFilesAndRmsafe = (args: {
    files: Record<string, string>;
    symlinks: Record<string, string>;
    rmsafeArgs: string[];
  }): { stdout: string; stderr: string; exitCode: number; tempDir: string } => {
    // create temp git repo with unique path
    const tempDir = genTempGitRepo({ slug: 'rmsafe-git' });

    // set up test fixtures
    setFilesInDir({ dir: tempDir, files: args.files });
    setSymlinksInDir({ dir: tempDir, symlinks: args.symlinks });

    // run rmsafe and return result with temp dir for assertions
    const result = runRmsafe({ cwd: tempDir, args: args.rmsafeArgs });
    return { ...result, tempDir };
  };

  /**
   * .what = set up temp directory (no git) with files, then run rmsafe.sh
   * .grain = orchestrator (composes communicators, no raw i/o)
   */
  const givenNonGitRepoWithFilesAndRmsafe = (args: {
    files: Record<string, string>;
    rmsafeArgs: string[];
  }): { stdout: string; stderr: string; exitCode: number; tempDir: string } => {
    // create temp directory without git
    const tempDir = genTempNonGitRepo({ slug: 'rmsafe-nogit' });

    // set up test fixtures
    setFilesInDir({ dir: tempDir, files: args.files });

    // run rmsafe and return result with temp dir for assertions
    const result = runRmsafe({ cwd: tempDir, args: args.rmsafeArgs });
    return { ...result, tempDir };
  };

  /**
   * .what = set up temp git repo with empty directory, then run rmsafe.sh
   * .grain = orchestrator (composes communicators, no raw i/o)
   */
  const givenEmptyDirAndRmsafe = (args: {
    dirName: string;
    rmsafeArgs: string[];
  }): { stdout: string; stderr: string; exitCode: number; tempDir: string } => {
    const tempDir = genTempGitRepo({ slug: 'rmsafe-empty-dir' });
    const dirPath = asFullPath({ dir: tempDir, relativePath: args.dirName });
    mkdirp({ at: dirPath });

    const result = runRmsafe({ cwd: tempDir, args: args.rmsafeArgs });

    return { ...result, tempDir };
  };

  /**
   * .what = set up sibling directory attack scenario, then run rmsafe.sh
   * .grain = orchestrator (composes communicators, no raw i/o)
   * .why = tests /repo-evil should not match /repo prefix vulnerability
   * .note = cleanup is returned for caller to invoke after test; if setup fails,
   *         test fails anyway and stale sibling dirs are acceptable in temp
   */
  const givenSiblingDirAttackAndRmsafe = (args: {
    siblingFileName: string;
  }): { stdout: string; stderr: string; exitCode: number; tempDir: string; siblingDir: string; siblingFile: string; cleanup: () => void } => {
    // set up temp git repo with sibling attack directory
    const tempDir = genTempGitRepo({ slug: 'rmsafe-sibling' });
    const siblingDir = asSiblingAttackDir({ tempDir });
    const siblingFile = asFullPath({ dir: siblingDir, relativePath: args.siblingFileName });

    // create malicious file in sibling directory
    setFileInDir({ dir: siblingDir, relativePath: args.siblingFileName, content: 'should not be deleted' });

    // run rmsafe with siblingFile as target
    const result = runRmsafe({ cwd: tempDir, args: [siblingFile] });
    const cleanup = (): void => rmdirRecursive({ at: siblingDir });
    return { ...result, tempDir, siblingDir, siblingFile, cleanup };
  };

  /**
   * .what = set up symlink chain escape scenario, then run rmsafe.sh
   * .grain = orchestrator (composes communicators, no raw i/o)
   * .why = tests symlink resolution for boundary checks
   * .note = cleanup is returned for caller to invoke after test; if setup fails,
   *         test fails anyway and stale outside dirs are acceptable in temp
   */
  const givenSymlinkChainEscapeAndRmsafe = (args: {
    outsideFileName: string;
    rmsafeArgs: string[];
  }): { stdout: string; stderr: string; exitCode: number; tempDir: string; outsideDir: string; cleanup: () => void } => {
    const outsideDir = genOutsideRepoPath({ slug: 'rmsafe-chain' });
    const cleanup = (): void => rmdirRecursive({ at: outsideDir });

    setFileInDir({ dir: outsideDir, relativePath: args.outsideFileName, content: 'outside content' });
    const tempDir = genTempGitRepo({ slug: 'rmsafe-symchain' });
    setSymlinksInDir({ dir: tempDir, symlinks: { 'link-to-outside': outsideDir } });
    const result = runRmsafe({ cwd: tempDir, args: args.rmsafeArgs });
    return { ...result, tempDir, outsideDir, cleanup };
  };

  /**
   * .what = set up outside-repo file scenario, then run rmsafe.sh
   * .grain = orchestrator (composes communicators, no raw i/o)
   * .why = tests boundary checks for files outside git repo
   * .note = cleanup is returned for caller to invoke after test; if setup fails,
   *         test fails anyway and stale outside files are acceptable in temp
   */
  const givenOutsideRepoFileAndRmsafe = (args: {
    slug: string;
    content: string;
    files: Record<string, string>;
    symlinks: Record<string, string>;
  }): { stdout: string; stderr: string; exitCode: number; tempDir: string; outsideFile: string; cleanup: () => void } => {
    // create file outside any repo
    const outsideBasePath = genOutsideRepoPath({ slug: args.slug });
    const outsideFile = asOutsideRepoFilePath({ basePath: outsideBasePath });
    setOutsideFile({ at: outsideFile, content: args.content });

    // set up temp git repo with fixtures
    const tempDir = genTempGitRepo({ slug: 'rmsafe-outside' });
    setFilesInDir({ dir: tempDir, files: args.files });
    setSymlinksInDir({ dir: tempDir, symlinks: args.symlinks });

    // run rmsafe with outsideFile as target
    const result = runRmsafe({ cwd: tempDir, args: [outsideFile] });
    const cleanup = (): void => unlinkIfExists({ at: outsideFile });
    return { ...result, tempDir, outsideFile, cleanup };
  };

  /**
   * .what = set up symlink inside repo to outside file, then run rmsafe.sh
   * .grain = orchestrator (composes communicators, no raw i/o)
   * .why = tests that symlink itself can be deleted even if target is outside repo
   * .note = cleanup is returned for caller to invoke after test; if setup fails,
   *         test fails anyway and stale outside files are acceptable in temp
   */
  const givenSymlinkToOutsideFileAndRmsafe = (args: {
    slug: string;
    symlinkName: string;
    rmsafeArgs: string[];
  }): { stdout: string; stderr: string; exitCode: number; tempDir: string; outsideFile: string; cleanup: () => void } => {
    const outsideBasePath = genOutsideRepoPath({ slug: args.slug });
    const outsideFile = asOutsideRepoFilePath({ basePath: outsideBasePath });
    const cleanup = (): void => unlinkIfExists({ at: outsideFile });

    setOutsideFile({ at: outsideFile, content: 'outside content' });
    const tempDir = genTempGitRepo({ slug: 'rmsafe-symlink-outside' });
    setSymlinkInDir({ dir: tempDir, relativePath: args.symlinkName, target: outsideFile });
    const result = runRmsafe({ cwd: tempDir, args: args.rmsafeArgs });
    return { ...result, tempDir, outsideFile, cleanup };
  };

  /**
   * .what = set up sequential delete scenario for trash overwrite test
   * .grain = orchestrator (composes communicators, no raw i/o)
   * .why = tests that second delete overwrites first in trash
   */
  const givenSequentialDeletesAndRmsafe = (args: {
    fileName: string;
    content1: string;
    content2: string;
    rmsafeArgs: string[];
  }): { result1: { stdout: string; stderr: string; exitCode: number }; result2: { stdout: string; stderr: string; exitCode: number }; tempDir: string; trashPath: string } => {
    const tempDir = genTempGitRepo({ slug: 'rmsafe-overwrite' });
    const trashPath = asTrashPath({ tempDir, fileName: args.fileName });

    const files1 = asFilesRecord({ fileName: args.fileName, content: args.content1 });
    setFilesInDir({ dir: tempDir, files: files1 });
    const result1 = runRmsafe({ cwd: tempDir, args: args.rmsafeArgs });

    const files2 = asFilesRecord({ fileName: args.fileName, content: args.content2 });
    setFilesInDir({ dir: tempDir, files: files2 });
    const result2 = runRmsafe({ cwd: tempDir, args: args.rmsafeArgs });

    return { result1, result2, tempDir, trashPath };
  };

  /**
   * .what = run git command with args
   * .why = executes git commands for test assertions
   * .grain = communicator (wraps raw process i/o with git-specific defaults)
   */
  const runGitCommand = (input: {
    args: string[];
    cwd: string;
  }): { stdout: string; stderr: string; exitCode: number } =>
    runProcess({
      command: 'git',
      args: input.args,
      cwd: input.cwd,
      label: 'runGitCommand',
      hint: 'check if git is installed',
    });

  /**
   * .what = extract git command output or throw on non-zero exit
   * .grain = transformer (pure validation + extraction)
   */
  const asGitSuccessOrThrow = (input: {
    result: { stdout: string; stderr: string; exitCode: number };
    operation: string;
    cwd: string;
    hint: string;
  }): { stdout: string; stderr: string } => {
    // fail loud if git command exited with error
    if (input.result.exitCode !== 0) {
      throw new MalfunctionError(`git ${input.operation} failed`, {
        operation: input.operation,
        cwd: input.cwd,
        exitCode: input.result.exitCode,
        stderr: input.result.stderr,
        hint: input.hint,
      });
    }

    return { stdout: input.result.stdout, stderr: input.result.stderr };
  };

  /**
   * .what = run git command and fail loud if exit code is non-zero
   * .grain = orchestrator (composes runGitCommand + asGitSuccessOrThrow)
   */
  const runGitCommandOrFail = (input: {
    args: string[];
    cwd: string;
    operation: string;
    hint: string;
  }): { stdout: string; stderr: string } => {
    const result = runGitCommand({ args: input.args, cwd: input.cwd });
    return asGitSuccessOrThrow({
      result,
      operation: input.operation,
      cwd: input.cwd,
      hint: input.hint,
    });
  };

  /**
   * .what = set up tracked+gitignored file scenario, then run rmsafe.sh
   * .grain = orchestrator (composes communicators, no raw i/o)
   * .why = tests rare edge case where file is tracked AND matches .gitignore pattern
   */
  const givenTrackedAndGitIgnoredFileAndRmsafe = (args: {
    fileName: string;
    content: string;
    gitignorePattern: string;
    rmsafeArgs: string[];
  }): { stdout: string; stderr: string; exitCode: number; tempDir: string } => {
    const tempDir = genTempGitRepo({ slug: 'rmsafe-tracked-ignored' });

    // create and commit the file first (makes it tracked)
    const files = asFilesRecord({ fileName: args.fileName, content: args.content });
    setFilesInDir({ dir: tempDir, files });

    // stage the file
    runGitCommandOrFail({
      args: ['add', args.fileName],
      cwd: tempDir,
      operation: 'add',
      hint: 'check if file exists and git repo is initialized',
    });

    // commit the file
    runGitCommandOrFail({
      args: ['commit', '-m', 'track file'],
      cwd: tempDir,
      operation: 'commit',
      hint: 'check if there are staged changes to commit',
    });

    // add gitignore pattern that matches the tracked file
    const gitignoreFiles = asFilesRecord({ fileName: '.gitignore', content: args.gitignorePattern });
    setFilesInDir({ dir: tempDir, files: gitignoreFiles });

    // run rmsafe on the tracked+gitignored file
    const result = runRmsafe({ cwd: tempDir, args: args.rmsafeArgs });

    return { ...result, tempDir };
  };

  /**
   * .what = set up directory with tracked+gitignored file scenario, then run rmsafe.sh -r
   * .grain = orchestrator (composes communicators, no raw i/o)
   * .why = tests edge case where directory has file that is tracked AND matches .gitignore
   */
  const givenTrackedAndGitIgnoredFileInDirAndRmsafe = (args: {
    dirName: string;
    fileName: string;
    content: string;
    gitignorePattern: string;
    rmsafeArgs: string[];
  }): { stdout: string; stderr: string; exitCode: number; tempDir: string } => {
    const tempDir = genTempGitRepo({ slug: 'rmsafe-dir-tracked-ignored' });

    // create and commit a file inside the directory
    const filePath = `${args.dirName}/${args.fileName}`;
    const files = asFilesRecord({ fileName: filePath, content: args.content });
    setFilesInDir({ dir: tempDir, files });

    // stage the file
    runGitCommandOrFail({
      args: ['add', filePath],
      cwd: tempDir,
      operation: 'add',
      hint: 'check if file exists and git repo is initialized',
    });

    // commit the file (makes it tracked)
    runGitCommandOrFail({
      args: ['commit', '-m', 'track file'],
      cwd: tempDir,
      operation: 'commit',
      hint: 'check if there are staged changes to commit',
    });

    // add gitignore pattern that matches the tracked file
    const gitignoreFiles = asFilesRecord({ fileName: '.gitignore', content: args.gitignorePattern });
    setFilesInDir({ dir: tempDir, files: gitignoreFiles });

    // run rmsafe on the directory with tracked+gitignored file
    const result = runRmsafe({ cwd: tempDir, args: args.rmsafeArgs });

    return { ...result, tempDir };
  };

  /**
   * .what = get OS temp directory prefix for sanitization
   * .grain = communicator (reads os temp dir path from environment)
   */
  const asTempDirPrefix = (): string => os.tmpdir();

  /**
   * .what = sanitize output for snapshot stability
   * .grain = transformer (pure string transformation)
   * .why = temp dir paths change between runs and across environments
   * .note = leverages os.tmpdir() to handle cross-platform paths (linux /tmp, macos /var/folders)
   */
  const sanitizeOutput = (output: string): string => {
    const tempPrefix = asTempDirPrefix();
    const tempRegex = new RegExp(`${tempPrefix.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}[^\\s]*`, 'g');
    return output
      // mask any paths under OS temp directory (cross-platform)
      .replace(tempRegex, '/TEMP_DIR');
  };

  given('[case1] positional args (like rm)', () => {
    when('[t0] single positional arg provided', () => {
      const result = useThen('rmsafe succeeds', () =>
        givenTempGitRepoWithFilesAndRmsafe({
          files: { 'target.txt': 'content' },
          symlinks: {},
          rmsafeArgs: ['./target.txt'],
        }),
      );

      then('file is removed', () => {
        expect(result.exitCode).toBe(0);
        expect(
          pathExists({ at: asFullPath({ dir: result.tempDir, relativePath: 'target.txt' }) }),
        ).toBe(false);
        expect(sanitizeOutput(result.stdout)).toMatchSnapshot();
        expect(sanitizeOutput(result.stderr)).toMatchSnapshot();
      });

      then('output shows relative path', () => {
        expect(result.stdout).toContain('removed');
        expect(result.stdout).toContain('target.txt');
      });
    });

    when('[t1] -r flag with directory', () => {
      then('directory is removed recursively', () => {
        const result = givenTempGitRepoWithFilesAndRmsafe({
          files: {
            'targetdir/file1.txt': 'content 1',
            'targetdir/subdir/file2.txt': 'content 2',
          },
          symlinks: {},
          rmsafeArgs: ['-r', './targetdir'],
        });

        expect(result.exitCode).toBe(0);
        expect(
          pathExists({ at: asFullPath({ dir: result.tempDir, relativePath: 'targetdir' }) }),
        ).toBe(false);
        expect(sanitizeOutput(result.stdout)).toMatchSnapshot();
        expect(sanitizeOutput(result.stderr)).toMatchSnapshot();
      });
    });
  });

  given('[case2] named args (--path)', () => {
    when('[t0] --path provided', () => {
      then('file is removed', () => {
        const result = givenTempGitRepoWithFilesAndRmsafe({
          files: { 'target.txt': 'content' },
          symlinks: {},
          rmsafeArgs: ['--path', './target.txt'],
        });

        expect(result.exitCode).toBe(0);
        expect(
          pathExists({ at: asFullPath({ dir: result.tempDir, relativePath: 'target.txt' }) }),
        ).toBe(false);
        expect(sanitizeOutput(result.stdout)).toMatchSnapshot();
        expect(sanitizeOutput(result.stderr)).toMatchSnapshot();
      });
    });

    when('[t1] --path with --recursive', () => {
      then('directory is removed', () => {
        const result = givenTempGitRepoWithFilesAndRmsafe({
          files: { 'targetdir/file.txt': 'content' },
          symlinks: {},
          rmsafeArgs: ['--path', './targetdir', '--recursive'],
        });

        expect(result.exitCode).toBe(0);
        expect(
          pathExists({ at: asFullPath({ dir: result.tempDir, relativePath: 'targetdir' }) }),
        ).toBe(false);
        expect(sanitizeOutput(result.stdout)).toMatchSnapshot();
        expect(sanitizeOutput(result.stderr)).toMatchSnapshot();
      });
    });
  });

  given('[case3] argument validation', () => {
    when('[t0] no arguments provided', () => {
      const result = useThen('rmsafe exits with error', () =>
        givenTempGitRepoWithFilesAndRmsafe({
          files: {},
          symlinks: {},
          rmsafeArgs: [],
        }),
      );

      then('exits with error', () => {
        expect(result.exitCode).toBe(2);
        expect(result.stdout).toContain('path is required');
        expect(result.stderr).toContain('path is required'); // errors go to both streams
        expect(sanitizeOutput(result.stdout)).toMatchSnapshot();
        expect(sanitizeOutput(result.stderr)).toMatchSnapshot();
      });

      then('shows usage', () => {
        expect(result.stdout).toContain('usage:');
        expect(result.stdout).toContain('rmsafe.sh');
      });
    });

    when('[t1] unknown option provided', () => {
      then('exits with error', () => {
        const result = givenTempGitRepoWithFilesAndRmsafe({
          files: { 'target.txt': 'content' },
          symlinks: {},
          rmsafeArgs: ['--unknown', 'value'],
        });

        expect(result.exitCode).toBe(2);
        expect(result.stdout).toContain('unknown option');
        expect(result.stderr).toContain('unknown option'); // errors go to both streams
        expect(sanitizeOutput(result.stdout)).toMatchSnapshot();
        expect(sanitizeOutput(result.stderr)).toMatchSnapshot();
      });
    });

    when('[t2] --help flag', () => {
      then('shows usage info and exits 0', () => {
        const result = givenTempGitRepoWithFilesAndRmsafe({
          files: {},
          symlinks: {},
          rmsafeArgs: ['--help'],
        });

        expect(result.exitCode).toBe(0);
        expect(result.stdout).toContain('rmsafe.sh - safe file removal');
        expect(result.stdout).toContain('usage:');
        expect(result.stdout).toContain('options:');
        expect(result.stdout).toContain('--literal');
        expect(result.stdout).toContain('trash');
        expect(sanitizeOutput(result.stdout)).toMatchSnapshot();
        expect(sanitizeOutput(result.stderr)).toMatchSnapshot();
      });
    });

    when('[t3] --path without value', () => {
      then('exits with error', () => {
        const result = givenTempGitRepoWithFilesAndRmsafe({
          files: {},
          symlinks: {},
          rmsafeArgs: ['--path'],
        });

        expect(result.exitCode).toBe(2);
        expect(result.stdout).toContain('--path requires a value');
        expect(result.stderr).toContain('--path requires a value'); // errors go to both streams
        expect(sanitizeOutput(result.stdout)).toMatchSnapshot();
        expect(sanitizeOutput(result.stderr)).toMatchSnapshot();
      });
    });

    when('[t4] --literal without path', () => {
      then('exits with error', () => {
        const result = givenTempGitRepoWithFilesAndRmsafe({
          files: {},
          symlinks: {},
          rmsafeArgs: ['--literal'],
        });

        expect(result.exitCode).toBe(2);
        expect(result.stdout).toContain('path is required');
        expect(result.stderr).toContain('path is required'); // errors go to both streams
        expect(sanitizeOutput(result.stdout)).toMatchSnapshot();
        expect(sanitizeOutput(result.stderr)).toMatchSnapshot();
      });
    });
  });

  given('[case4] target validation', () => {
    when('[t0] target does not exist', () => {
      then('exits with error', () => {
        const result = givenTempGitRepoWithFilesAndRmsafe({
          files: {},
          symlinks: {},
          rmsafeArgs: ['./nonexistent.txt'],
        });

        expect(result.exitCode).toBe(2);
        expect(result.stdout).toContain('path does not exist');
        expect(result.stderr).toContain('path does not exist'); // errors go to both streams
        expect(sanitizeOutput(result.stdout)).toMatchSnapshot();
        expect(sanitizeOutput(result.stderr)).toMatchSnapshot();
      });
    });

    when('[t1] target is directory without -r', () => {
      then('exits with error', () => {
        const result = givenTempGitRepoWithFilesAndRmsafe({
          files: { 'targetdir/file.txt': 'content' },
          symlinks: {},
          rmsafeArgs: ['./targetdir'],
        });

        expect(result.exitCode).toBe(2);
        expect(result.stdout).toContain('target is a directory');
        expect(result.stdout).toContain('--recursive');
        expect(result.stderr).toContain('target is a directory'); // errors go to both streams
        expect(sanitizeOutput(result.stdout)).toMatchSnapshot();
        expect(sanitizeOutput(result.stderr)).toMatchSnapshot();
      });
    });

    when('[t2] target is repo root', () => {
      then('exits with error', () => {
        const result = givenTempGitRepoWithFilesAndRmsafe({
          files: { 'file.txt': 'content' },
          symlinks: {},
          rmsafeArgs: ['-r', '.'],
        });

        expect(result.exitCode).toBe(2);
        expect(result.stdout).toContain('cannot delete the repository root');
        expect(result.stderr).toContain('cannot delete the repository root'); // errors go to both streams
        expect(sanitizeOutput(result.stdout)).toMatchSnapshot();
        expect(sanitizeOutput(result.stderr)).toMatchSnapshot();
      });
    });
  });

  given('[case5] safety boundary - target outside repo', () => {
    when('[t0] target path is absolute outside repo', () => {
      then('exits with error', () => {
        const result = givenOutsideRepoFileAndRmsafe({
          slug: 'rmsafe-test',
          content: 'outside content',
          files: {},
          symlinks: {},
        });

        expect(result.exitCode).toBe(2);
        expect(result.stdout).toContain(
          'path must be within the git repository',
        );
        expect(sanitizeOutput(result.stdout)).toMatchSnapshot();
        expect(sanitizeOutput(result.stderr)).toMatchSnapshot();
        // verify file was NOT deleted
        expect(pathExists({ at: result.outsideFile })).toBe(true);
        result.cleanup();
      });
    });

    when(
      '[t1] target is symlink inside repo (even if it points outside)',
      () => {
        then('symlink is removed but external target is preserved', () => {
          // symlink INSIDE repo pointing OUTSIDE is safe to delete
          // we're just removing the link, not the external target
          const result = givenSymlinkToOutsideFileAndRmsafe({
            slug: 'rmsafe-symlink-target',
            symlinkName: 'link-to-outside.txt',
            rmsafeArgs: ['./link-to-outside.txt'],
          });

          expect(result.exitCode).toBe(0);
          // symlink removed
          expect(
            pathExists({
              at: asFullPath({
                dir: result.tempDir,
                relativePath: 'link-to-outside.txt',
              }),
            }),
          ).toBe(false);
          // external target preserved
          expect(pathExists({ at: result.outsideFile })).toBe(true);
          expect(sanitizeOutput(result.stdout)).toMatchSnapshot();
          expect(sanitizeOutput(result.stderr)).toMatchSnapshot();
          result.cleanup();
        });
      },
    );

    when('[t2] target uses .. to escape repo', () => {
      then('exits with error', () => {
        // create the file outside repo so we test the boundary check, not just "not found"
        const result = givenOutsideRepoFileAndRmsafe({
          slug: 'rmsafe-escape',
          content: 'outside content',
          files: { 'file.txt': 'content' },
          symlinks: {},
        });

        expect(result.exitCode).toBe(2);
        expect(result.stdout).toContain(
          'path must be within the git repository',
        );
        expect(result.stderr).toContain(
          'path must be within the git repository',
        ); // errors go to both streams
        expect(sanitizeOutput(result.stdout)).toMatchSnapshot();
        expect(sanitizeOutput(result.stderr)).toMatchSnapshot();
        // verify file was NOT deleted
        expect(pathExists({ at: result.outsideFile })).toBe(true);
        result.cleanup();
      });
    });

    when('[t3] target is in sibling directory with repo-prefix name', () => {
      then('exits with error (prevents /repo from match of /repo-evil)', () => {
        const result = givenSiblingDirAttackAndRmsafe({
          siblingFileName: 'malicious.txt',
        });

        expect(result.exitCode).toBe(2);
        expect(result.stdout).toContain(
          'path must be within the git repository',
        );
        expect(result.stderr).toContain(
          'path must be within the git repository',
        ); // errors go to both streams
        expect(sanitizeOutput(result.stdout)).toMatchSnapshot();
        expect(sanitizeOutput(result.stderr)).toMatchSnapshot();
        // verify file was NOT deleted
        expect(pathExists({ at: result.siblingFile })).toBe(true);
        result.cleanup();
      });
    });
  });

  given('[case6] recursive removal', () => {
    when('[t0] directory with nested content', () => {
      then('all content is removed', () => {
        const result = givenTempGitRepoWithFilesAndRmsafe({
          files: {
            'targetdir/file1.txt': 'content 1',
            'targetdir/file2.txt': 'content 2',
            'targetdir/subdir/file3.txt': 'content 3',
            'targetdir/subdir/deep/file4.txt': 'content 4',
          },
          symlinks: {},
          rmsafeArgs: ['-r', './targetdir'],
        });

        expect(result.exitCode).toBe(0);
        expect(
          pathExists({ at: asFullPath({ dir: result.tempDir, relativePath: 'targetdir' }) }),
        ).toBe(false);
        expect(sanitizeOutput(result.stdout)).toMatchSnapshot();
        expect(sanitizeOutput(result.stderr)).toMatchSnapshot();
      });
    });

    when('[t1] empty directory', () => {
      then('directory is removed', () => {
        const result = givenEmptyDirAndRmsafe({
          dirName: 'emptydir',
          rmsafeArgs: ['-r', './emptydir'],
        });

        expect(result.exitCode).toBe(0);
        expect(
          pathExists({ at: asFullPath({ dir: result.tempDir, relativePath: 'emptydir' }) }),
        ).toBe(false);
        expect(sanitizeOutput(result.stdout)).toMatchSnapshot();
        expect(sanitizeOutput(result.stderr)).toMatchSnapshot();
      });
    });
  });

  given('[case7] not in git repo', () => {
    when('[t0] run outside any git repo', () => {
      then('exits with error', () => {
        const result = givenNonGitRepoWithFilesAndRmsafe({
          files: { 'target.txt': 'content' },
          rmsafeArgs: ['./target.txt'],
        });

        expect(result.exitCode).toBe(2);
        expect(result.stdout).toContain('not in a git repository');
        expect(sanitizeOutput(result.stdout)).toMatchSnapshot();
        expect(sanitizeOutput(result.stderr)).toMatchSnapshot();
      });
    });
  });

  given('[case8] symlink chain resolution', () => {
    when('[t0] target path contains symlink that escapes repo', () => {
      then('symlink is resolved for boundary check', () => {
        const result = givenSymlinkChainEscapeAndRmsafe({
          outsideFileName: 'file.txt',
          rmsafeArgs: ['./link-to-outside/file.txt'],
        });

        expect(result.exitCode).toBe(2);
        expect(result.stdout).toContain(
          'path must be within the git repository',
        );
        expect(sanitizeOutput(result.stdout)).toMatchSnapshot();
        expect(sanitizeOutput(result.stderr)).toMatchSnapshot();
        // verify outside file was NOT deleted
        expect(
          pathExists({ at: asFullPath({ dir: result.outsideDir, relativePath: 'file.txt' }) }),
        ).toBe(true);
        result.cleanup();
      });
    });

    when('[t1] target is symlink within repo', () => {
      then('symlink itself is removed (not target)', () => {
        const result = givenTempGitRepoWithFilesAndRmsafe({
          files: { 'real-file.txt': 'content' },
          symlinks: { 'link-to-file.txt': 'real-file.txt' },
          rmsafeArgs: ['./link-to-file.txt'],
        });

        expect(result.exitCode).toBe(0);
        // symlink removed
        expect(
          pathExists({ at: asFullPath({ dir: result.tempDir, relativePath: 'link-to-file.txt' }) }),
        ).toBe(false);
        // target still exists
        expect(
          pathExists({ at: asFullPath({ dir: result.tempDir, relativePath: 'real-file.txt' }) }),
        ).toBe(true);
        expect(sanitizeOutput(result.stdout)).toMatchSnapshot();
        expect(sanitizeOutput(result.stderr)).toMatchSnapshot();
      });
    });
  });

  given('[case9] special characters in paths', () => {
    when('[t0] filename has spaces', () => {
      then('file is removed correctly', () => {
        const result = givenTempGitRepoWithFilesAndRmsafe({
          files: { 'target file.txt': 'content with spaces' },
          symlinks: {},
          rmsafeArgs: ['./target file.txt'],
        });

        expect(result.exitCode).toBe(0);
        expect(
          pathExists({ at: asFullPath({ dir: result.tempDir, relativePath: 'target file.txt' }) }),
        ).toBe(false);
        expect(sanitizeOutput(result.stdout)).toMatchSnapshot();
        expect(sanitizeOutput(result.stderr)).toMatchSnapshot();
      });
    });

    when('[t1] filename has unicode', () => {
      then('file is removed correctly', () => {
        // 目标文件 = "target file"
        const result = givenTempGitRepoWithFilesAndRmsafe({
          files: { '目标文件.txt': 'unicode content' },
          symlinks: {},
          rmsafeArgs: ['./目标文件.txt'],
        });

        expect(result.exitCode).toBe(0);
        expect(
          pathExists({ at: asFullPath({ dir: result.tempDir, relativePath: '目标文件.txt' }) }),
        ).toBe(false);
        expect(sanitizeOutput(result.stdout)).toMatchSnapshot();
        expect(sanitizeOutput(result.stderr)).toMatchSnapshot();
      });
    });
  });

  given('[case10] other files remain', () => {
    when('[t0] multiple files exist', () => {
      then('only target is removed', () => {
        const result = givenTempGitRepoWithFilesAndRmsafe({
          files: {
            'target.txt': 'to be removed',
            'keep1.txt': 'keep me',
            'keep2.txt': 'keep me too',
          },
          symlinks: {},
          rmsafeArgs: ['./target.txt'],
        });

        expect(result.exitCode).toBe(0);
        expect(
          pathExists({ at: asFullPath({ dir: result.tempDir, relativePath: 'target.txt' }) }),
        ).toBe(false);
        expect(
          pathExists({ at: asFullPath({ dir: result.tempDir, relativePath: 'keep1.txt' }) }),
        ).toBe(true);
        expect(
          pathExists({ at: asFullPath({ dir: result.tempDir, relativePath: 'keep2.txt' }) }),
        ).toBe(true);
        expect(sanitizeOutput(result.stdout)).toMatchSnapshot();
        expect(sanitizeOutput(result.stderr)).toMatchSnapshot();
      });
    });
  });

  given('[case11] glob patterns', () => {
    when('[t0] glob matches multiple files', () => {
      const result = useThen('rmsafe succeeds', () =>
        givenTempGitRepoWithFilesAndRmsafe({
          files: {
            'build/a.tmp': 'temp a',
            'build/b.tmp': 'temp b',
            'build/c.tmp': 'temp c',
            'build/keep.txt': 'keep this',
          },
          symlinks: {},
          rmsafeArgs: ['--path', 'build/*.tmp'],
        }),
      );

      then('all files are removed', () => {
        expect(result.exitCode).toBe(0);
        expect(
          pathExists({ at: asFullPath({ dir: result.tempDir, relativePath: 'build/a.tmp' }) }),
        ).toBe(false);
        expect(
          pathExists({ at: asFullPath({ dir: result.tempDir, relativePath: 'build/b.tmp' }) }),
        ).toBe(false);
        expect(
          pathExists({ at: asFullPath({ dir: result.tempDir, relativePath: 'build/c.tmp' }) }),
        ).toBe(false);
        expect(
          pathExists({ at: asFullPath({ dir: result.tempDir, relativePath: 'build/keep.txt' }) }),
        ).toBe(true);
        expect(sanitizeOutput(result.stdout)).toMatchSnapshot();
        expect(sanitizeOutput(result.stderr)).toMatchSnapshot();
      });

      then('output shows each file removed', () => {
        expect(result.stdout).toContain('files: 3');
        expect(result.stdout).toContain('a.tmp');
        expect(result.stdout).toContain('b.tmp');
        expect(result.stdout).toContain('c.tmp');
      });

      then('output shows turtle sweet header', () => {
        expect(result.stdout).toContain('sweet');
      });
    });

    when('[t1] glob matches zero files', () => {
      then('output shows crickets header', () => {
        const result = givenTempGitRepoWithFilesAndRmsafe({
          files: { 'build/a.txt': 'not a match' },
          symlinks: {},
          rmsafeArgs: ['--path', 'build/*.xyz'],
        });

        expect(result.exitCode).toBe(0);
        expect(result.stdout).toContain('crickets');
        expect(result.stdout).toContain('files: 0');
        expect(result.stdout).toContain('(none)');
        expect(sanitizeOutput(result.stdout)).toMatchSnapshot();
        expect(sanitizeOutput(result.stderr)).toMatchSnapshot();
      });
    });

    when('[t2] recursive glob **/*.bak', () => {
      then('matches files in nested directories', () => {
        const result = givenTempGitRepoWithFilesAndRmsafe({
          files: {
            'src/utils/foo.bak': 'backup',
            'src/core/bar.bak': 'backup',
            'src/deep/nested/baz.bak': 'backup',
            'src/keep.ts': 'keep',
          },
          symlinks: {},
          rmsafeArgs: ['--path', 'src/**/*.bak'],
        });

        expect(result.exitCode).toBe(0);
        expect(
          pathExists({ at: asFullPath({ dir: result.tempDir, relativePath: 'src/utils/foo.bak' }) }),
        ).toBe(false);
        expect(
          pathExists({ at: asFullPath({ dir: result.tempDir, relativePath: 'src/core/bar.bak' }) }),
        ).toBe(false);
        expect(
          pathExists({ at: asFullPath({ dir: result.tempDir, relativePath: 'src/deep/nested/baz.bak' }) }),
        ).toBe(false);
        expect(
          pathExists({ at: asFullPath({ dir: result.tempDir, relativePath: 'src/keep.ts' }) }),
        ).toBe(true);
        expect(sanitizeOutput(result.stdout)).toMatchSnapshot();
        expect(sanitizeOutput(result.stderr)).toMatchSnapshot();
      });
    });
  });

  given('[case12] tree output format', () => {
    when('[t0] single file removal', () => {
      then('output has turtle, shell, and tree structure', () => {
        const result = givenTempGitRepoWithFilesAndRmsafe({
          files: { 'target.txt': 'content' },
          symlinks: {},
          rmsafeArgs: ['--path', './target.txt'],
        });

        expect(result.stdout).toContain('🐢');
        expect(result.stdout).toContain('🐚 rmsafe');
        expect(result.stdout).toContain('path:');
        expect(result.stdout).toContain('files:');
        expect(result.stdout).toContain('removed');
        expect(sanitizeOutput(result.stdout)).toMatchSnapshot();
        expect(sanitizeOutput(result.stderr)).toMatchSnapshot();
      });
    });
  });

  given('[case13] bracket characters with --literal flag', () => {
    when('[t0] file with brackets exists and --literal used', () => {
      then('file is removed successfully', () => {
        const result = givenTempGitRepoWithFilesAndRmsafe({
          files: { 'doc.[ref].md': 'bracket content' },
          symlinks: {},
          rmsafeArgs: ['--literal', './doc.[ref].md'],
        });

        expect(result.exitCode).toBe(0);
        expect(
          pathExists({ at: asFullPath({ dir: result.tempDir, relativePath: 'doc.[ref].md' }) }),
        ).toBe(false);
        expect(sanitizeOutput(result.stdout)).toMatchSnapshot();
        expect(sanitizeOutput(result.stderr)).toMatchSnapshot();
      });
    });

    when('[t1] file with brackets absent and --literal used', () => {
      then('exits with error for absent file', () => {
        const result = givenTempGitRepoWithFilesAndRmsafe({
          files: {},
          symlinks: {},
          rmsafeArgs: ['--literal', './absent.[ref].md'],
        });

        expect(result.exitCode).toBe(2);
        expect(result.stdout).not.toContain('did you know');
        expect(sanitizeOutput(result.stdout)).toMatchSnapshot();
        expect(sanitizeOutput(result.stderr)).toMatchSnapshot();
      });
    });

    when('[t2] file with brackets exists and escape syntax used', () => {
      then('file is removed successfully', () => {
        const result = givenTempGitRepoWithFilesAndRmsafe({
          files: { 'doc.[ref].md': 'bracket content' },
          symlinks: {},
          rmsafeArgs: ['./doc.\\[ref\\].md'],
        });

        expect(result.exitCode).toBe(0);
        expect(
          pathExists({ at: asFullPath({ dir: result.tempDir, relativePath: 'doc.[ref].md' }) }),
        ).toBe(false);
        expect(sanitizeOutput(result.stdout)).toMatchSnapshot();
        expect(sanitizeOutput(result.stderr)).toMatchSnapshot();
      });
    });

    when('[t3] brackets used without --literal and no match', () => {
      then('shows did-you-know hint', () => {
        const result = givenTempGitRepoWithFilesAndRmsafe({
          files: { 'other.md': 'other content' },
          symlinks: {},
          rmsafeArgs: ['./doc.[ref].md'],
        });

        expect(result.exitCode).toBe(0);
        expect(result.stdout).toContain('files: 0');
        expect(result.stdout).toContain('did you know');
        expect(result.stdout).toContain('--literal');
        expect(sanitizeOutput(result.stdout)).toMatchSnapshot();
        expect(sanitizeOutput(result.stderr)).toMatchSnapshot();
      });
    });

    when('[t4] brackets used without --literal but file matches', () => {
      then('bracket hint does not appear on success', () => {
        const result = givenTempGitRepoWithFilesAndRmsafe({
          files: { 'doc.r.md': 'matches [ref] as r' },
          symlinks: {},
          rmsafeArgs: ['./doc.[ref].md'],
        });

        expect(result.exitCode).toBe(0);
        expect(result.stdout).not.toContain('--literal');
        expect(sanitizeOutput(result.stdout)).toMatchSnapshot();
        expect(sanitizeOutput(result.stderr)).toMatchSnapshot();
      });
    });
  });

  given('[case14] trash feature', () => {
    when('[t0] single file deleted', () => {
      const result = useThen('rmsafe trashes file', () =>
        givenTempGitRepoWithFilesAndRmsafe({
          files: { 'src/target.txt': 'content to trash' },
          symlinks: {},
          rmsafeArgs: ['./src/target.txt'],
        }),
      );

      then('file extant in trash at mirrored path', () => {
        expect(result.exitCode).toBe(0);
        expect(
          pathExists({ at: asFullPath({ dir: result.tempDir, relativePath: 'src/target.txt' }) }),
        ).toBe(false);
        expect(
          pathExists({ at: asFullPath({ dir: result.tempDir, relativePath: `${trashRel}/src/target.txt` }) }),
        ).toBe(true);
        expect(
          readFile({ at: asFullPath({ dir: result.tempDir, relativePath: `${trashRel}/src/target.txt` }) }),
        ).toBe('content to trash');
        expect(sanitizeOutput(result.stdout)).toMatchSnapshot();
        expect(sanitizeOutput(result.stderr)).toMatchSnapshot();
      });

      then('trash dir has .gitignore', () => {
        const gitignorePath = asFullPath({
          dir: result.tempDir,
          relativePath: `${trashRel}/.gitignore`,
        });
        expect(pathExists({ at: gitignorePath })).toBe(true);
        expect(readFile({ at: gitignorePath })).toBe('*\n!.gitignore\n');
      });

      then('output includes coconut restore hint', () => {
        expect(result.stdout).toContain('🥥 did you know?');
        expect(result.stdout).toContain('you can restore from trash');
        expect(result.stdout).toContain('rhx cpsafe');
        expect(result.stdout).toContain(trashRel);
      });
    });

    when('[t1] directory deleted with -r', () => {
      then('directory structure preserved in trash', () => {
        const result = givenTempGitRepoWithFilesAndRmsafe({
          files: {
            'mydir/file1.txt': 'content 1',
            'mydir/subdir/file2.txt': 'content 2',
          },
          symlinks: {},
          rmsafeArgs: ['-r', './mydir'],
        });

        expect(result.exitCode).toBe(0);
        expect(
          pathExists({ at: asFullPath({ dir: result.tempDir, relativePath: 'mydir' }) }),
        ).toBe(false);
        expect(
          pathExists({ at: asFullPath({ dir: result.tempDir, relativePath: `${trashRel}/mydir/file1.txt` }) }),
        ).toBe(true);
        expect(
          pathExists({ at: asFullPath({ dir: result.tempDir, relativePath: `${trashRel}/mydir/subdir/file2.txt` }) }),
        ).toBe(true);
        expect(sanitizeOutput(result.stdout)).toMatchSnapshot();
        expect(sanitizeOutput(result.stderr)).toMatchSnapshot();
      });

      then('output includes coconut restore hint', () => {
        const result = givenTempGitRepoWithFilesAndRmsafe({
          files: { 'mydir/file.txt': 'content' },
          symlinks: {},
          rmsafeArgs: ['-r', './mydir'],
        });

        expect(result.stdout).toContain('🥥 did you know?');
        expect(result.stdout).toContain('rhx cpsafe');
        expect(sanitizeOutput(result.stdout)).toMatchSnapshot();
        expect(sanitizeOutput(result.stderr)).toMatchSnapshot();
      });
    });

    when('[t2] same file deleted twice', () => {
      then('second version overwrites first in trash', () => {
        const result = givenSequentialDeletesAndRmsafe({
          fileName: 'target.txt',
          content1: 'version 1',
          content2: 'version 2',
          rmsafeArgs: ['./target.txt'],
        });

        expect(readFile({ at: result.trashPath })).toBe('version 2');
        expect(sanitizeOutput(result.result1.stdout)).toMatchSnapshot();
        expect(sanitizeOutput(result.result1.stderr)).toMatchSnapshot();
        expect(sanitizeOutput(result.result2.stdout)).toMatchSnapshot();
        expect(sanitizeOutput(result.result2.stderr)).toMatchSnapshot();
      });
    });

    when('[t3] symlink deleted', () => {
      then('symlink in trash, not target', () => {
        const result = givenTempGitRepoWithFilesAndRmsafe({
          files: { 'real-file.txt': 'real content' },
          symlinks: { 'link-to-file.txt': './real-file.txt' },
          rmsafeArgs: ['./link-to-file.txt'],
        });

        expect(result.exitCode).toBe(0);
        // original symlink removed
        expect(
          pathExists({ at: asFullPath({ dir: result.tempDir, relativePath: 'link-to-file.txt' }) }),
        ).toBe(false);
        // target file unchanged
        expect(
          pathExists({ at: asFullPath({ dir: result.tempDir, relativePath: 'real-file.txt' }) }),
        ).toBe(true);
        expect(
          readFile({ at: asFullPath({ dir: result.tempDir, relativePath: 'real-file.txt' }) }),
        ).toBe('real content');
        // symlink in trash (as symlink, not dereferenced)
        const trashLink = asFullPath({
          dir: result.tempDir,
          relativePath: `${trashRel}/link-to-file.txt`,
        });
        expect(isSymlink({ at: trashLink })).toBe(true);
        expect(sanitizeOutput(result.stdout)).toMatchSnapshot();
        expect(sanitizeOutput(result.stderr)).toMatchSnapshot();
      });
    });

    when('[t4] glob matches zero files', () => {
      then('no coconut hint (crickets output)', () => {
        const result = givenTempGitRepoWithFilesAndRmsafe({
          files: { 'keep.txt': 'content' },
          symlinks: {},
          rmsafeArgs: ['--path', '*.xyz'],
        });

        expect(result.exitCode).toBe(0);
        expect(result.stdout).toContain('crickets');
        expect(result.stdout).not.toContain('🥥');
        expect(result.stdout).not.toContain('did you know');
        expect(sanitizeOutput(result.stdout)).toMatchSnapshot();
        expect(sanitizeOutput(result.stderr)).toMatchSnapshot();
      });
    });
  });

  given('[case15] not trackable files bypass trash', () => {
    when('[t0] file is trackable', () => {
      then('file goes to trash', () => {
        const result = givenTempGitRepoWithFilesAndRmsafe({
          files: {
            '.gitignore': '# empty gitignore\n',
            'src/trackable.ts': 'trackable content',
          },
          symlinks: {},
          rmsafeArgs: ['./src/trackable.ts'],
        });

        expect(result.exitCode).toBe(0);
        expect(
          pathExists({ at: asFullPath({ dir: result.tempDir, relativePath: 'src/trackable.ts' }) }),
        ).toBe(false);
        expect(
          pathExists({ at: asFullPath({ dir: result.tempDir, relativePath: `${trashRel}/src/trackable.ts` }) }),
        ).toBe(true);
        expect(result.stdout).not.toContain('(not trackable)');
        expect(result.stdout).toContain('🥥');
        expect(sanitizeOutput(result.stdout)).toMatchSnapshot();
        expect(sanitizeOutput(result.stderr)).toMatchSnapshot();
      });
    });

    when('[t1] file is not trackable', () => {
      then('file is deleted directly without trash', () => {
        const result = givenTempGitRepoWithFilesAndRmsafe({
          files: {
            '.gitignore': '*.log\n',
            'debug.log': 'log content',
          },
          symlinks: {},
          rmsafeArgs: ['./debug.log'],
        });

        expect(result.exitCode).toBe(0);
        expect(
          pathExists({ at: asFullPath({ dir: result.tempDir, relativePath: 'debug.log' }) }),
        ).toBe(false);
        expect(
          pathExists({ at: asFullPath({ dir: result.tempDir, relativePath: `${trashRel}/debug.log` }) }),
        ).toBe(false);
        expect(result.stdout).toContain('(not trackable)');
        expect(result.stdout).not.toContain('🥥');
        expect(sanitizeOutput(result.stdout)).toMatchSnapshot();
        expect(sanitizeOutput(result.stderr)).toMatchSnapshot();
      });
    });

    when('[t2] directory is entirely not trackable', () => {
      then('entire directory is deleted directly without trash', () => {
        const result = givenTempGitRepoWithFilesAndRmsafe({
          files: {
            '.gitignore': 'node_modules/\n',
            'node_modules/pkg/index.js': 'module.exports = {}',
            'node_modules/pkg/package.json': '{"name": "pkg"}',
          },
          symlinks: {},
          rmsafeArgs: ['-r', './node_modules'],
        });

        expect(result.exitCode).toBe(0);
        expect(
          pathExists({ at: asFullPath({ dir: result.tempDir, relativePath: 'node_modules' }) }),
        ).toBe(false);
        expect(
          pathExists({ at: asFullPath({ dir: result.tempDir, relativePath: trashRel }) }),
        ).toBe(false);
        expect(result.stdout).toContain('(not trackable)');
        expect(result.stdout).not.toContain('🥥');
        expect(sanitizeOutput(result.stdout)).toMatchSnapshot();
        expect(sanitizeOutput(result.stderr)).toMatchSnapshot();
      });
    });

    when('[t3] directory has all trackable files', () => {
      then('all files go to trash', () => {
        const result = givenTempGitRepoWithFilesAndRmsafe({
          files: {
            '.gitignore': '# empty gitignore\n',
            'src/index.ts': 'export {}',
            'src/utils/helper.ts': 'export const help = () => {}',
          },
          symlinks: {},
          rmsafeArgs: ['-r', './src'],
        });

        expect(result.exitCode).toBe(0);
        expect(
          pathExists({ at: asFullPath({ dir: result.tempDir, relativePath: 'src' }) }),
        ).toBe(false);
        expect(
          pathExists({ at: asFullPath({ dir: result.tempDir, relativePath: `${trashRel}/src/index.ts` }) }),
        ).toBe(true);
        expect(
          pathExists({ at: asFullPath({ dir: result.tempDir, relativePath: `${trashRel}/src/utils/helper.ts` }) }),
        ).toBe(true);
        expect(result.stdout).not.toContain('(not trackable)');
        expect(result.stdout).toContain('🥥');
        expect(sanitizeOutput(result.stdout)).toMatchSnapshot();
        expect(sanitizeOutput(result.stderr)).toMatchSnapshot();
      });
    });

    when('[t4] directory has mixed trackable and not trackable files', () => {
      then('trackable files go to trash, not trackable files are direct deleted', () => {
        const result = givenTempGitRepoWithFilesAndRmsafe({
          files: {
            '.gitignore': '*.log\n.cache/\n',
            'src/index.ts': 'export {}',
            'src/debug.log': 'debug output',
            'src/.cache/temp.json': '{}',
          },
          symlinks: {},
          rmsafeArgs: ['-r', './src'],
        });

        expect(result.exitCode).toBe(0);
        expect(
          pathExists({ at: asFullPath({ dir: result.tempDir, relativePath: 'src' }) }),
        ).toBe(false);
        // trackable file in trash
        expect(
          pathExists({ at: asFullPath({ dir: result.tempDir, relativePath: `${trashRel}/src/index.ts` }) }),
        ).toBe(true);
        // not trackable files NOT in trash
        expect(
          pathExists({ at: asFullPath({ dir: result.tempDir, relativePath: `${trashRel}/src/debug.log` }) }),
        ).toBe(false);
        expect(
          pathExists({ at: asFullPath({ dir: result.tempDir, relativePath: `${trashRel}/src/.cache/temp.json` }) }),
        ).toBe(false);
        expect(result.stdout).toContain('🥥');
        expect(sanitizeOutput(result.stdout)).toMatchSnapshot();
        expect(sanitizeOutput(result.stderr)).toMatchSnapshot();
      });
    });

    when('[t5] glob matches both trackable and not trackable files', () => {
      then('each file handled individually', () => {
        const result = givenTempGitRepoWithFilesAndRmsafe({
          files: {
            '.gitignore': 'build/generated/\n',
            'build/output.ts': 'console.log("built")',
            'build/generated/types.ts': 'declare {}',
          },
          symlinks: {},
          rmsafeArgs: ['--path', 'build/**/*.ts'],
        });

        expect(result.exitCode).toBe(0);
        expect(
          pathExists({ at: asFullPath({ dir: result.tempDir, relativePath: 'build/output.ts' }) }),
        ).toBe(false);
        expect(
          pathExists({ at: asFullPath({ dir: result.tempDir, relativePath: 'build/generated/types.ts' }) }),
        ).toBe(false);
        // trackable file in trash
        expect(
          pathExists({ at: asFullPath({ dir: result.tempDir, relativePath: `${trashRel}/build/output.ts` }) }),
        ).toBe(true);
        // not trackable file NOT in trash
        expect(
          pathExists({ at: asFullPath({ dir: result.tempDir, relativePath: `${trashRel}/build/generated/types.ts` }) }),
        ).toBe(false);
        expect(result.stdout).toContain('(not trackable)');
        expect(sanitizeOutput(result.stdout)).toMatchSnapshot();
        expect(sanitizeOutput(result.stderr)).toMatchSnapshot();
      });
    });

    when('[t5.5] glob matches only not trackable files', () => {
      then('all files direct deleted, no trash created', () => {
        const result = givenTempGitRepoWithFilesAndRmsafe({
          files: {
            // build/generated/ is gitignored, build/ is trackable
            '.gitignore': 'build/generated/\n',
            'build/generated/types.d.ts': 'declare {}',
            'build/generated/index.d.ts': 'export {}',
            'build/generated/deep/nested.d.ts': 'nested',
          },
          symlinks: {},
          // glob matches only files inside gitignored directory
          rmsafeArgs: ['--path', 'build/generated/**/*.d.ts'],
        });

        expect(result.exitCode).toBe(0);
        expect(
          pathExists({ at: asFullPath({ dir: result.tempDir, relativePath: 'build/generated/types.d.ts' }) }),
        ).toBe(false);
        expect(
          pathExists({ at: asFullPath({ dir: result.tempDir, relativePath: 'build/generated/index.d.ts' }) }),
        ).toBe(false);
        expect(
          pathExists({ at: asFullPath({ dir: result.tempDir, relativePath: 'build/generated/deep/nested.d.ts' }) }),
        ).toBe(false);
        // no trash created - all matched files were gitignored
        expect(
          pathExists({ at: asFullPath({ dir: result.tempDir, relativePath: trashRel }) }),
        ).toBe(false);
        // files marked as gitignored
        expect(result.stdout).toContain('(not trackable)');
        // no coconut hint for gitignored files
        expect(result.stdout).not.toContain('🥥');
        expect(sanitizeOutput(result.stdout)).toMatchSnapshot();
        expect(sanitizeOutput(result.stderr)).toMatchSnapshot();
      });
    });

    when('[t6] symlink path is not trackable (not target)', () => {
      then('symlink is direct deleted based on symlink path', () => {
        const result = givenTempGitRepoWithFilesAndRmsafe({
          files: {
            '.gitignore': 'links/\n',
            'src/real.ts': 'export {}',
          },
          symlinks: { 'links/to-src.ts': '../src/real.ts' },
          rmsafeArgs: ['./links/to-src.ts'],
        });

        expect(result.exitCode).toBe(0);
        expect(
          pathExists({ at: asFullPath({ dir: result.tempDir, relativePath: 'links/to-src.ts' }) }),
        ).toBe(false);
        // symlink NOT in trash (not trackable)
        expect(
          pathExists({ at: asFullPath({ dir: result.tempDir, relativePath: `${trashRel}/links/to-src.ts` }) }),
        ).toBe(false);
        // target still exists
        expect(
          pathExists({ at: asFullPath({ dir: result.tempDir, relativePath: 'src/real.ts' }) }),
        ).toBe(true);
        expect(result.stdout).toContain('(not trackable)');
        expect(sanitizeOutput(result.stdout)).toMatchSnapshot();
        expect(sanitizeOutput(result.stderr)).toMatchSnapshot();
      });
    });

    when('[t7] symlink in trackable location (target also trackable)', () => {
      then('symlink goes to trash based on symlink path', () => {
        const result = givenTempGitRepoWithFilesAndRmsafe({
          files: {
            'lib/utils.ts': 'export const util = () => {}',
          },
          symlinks: { 'src/link-to-lib.ts': '../lib/utils.ts' },
          rmsafeArgs: ['./src/link-to-lib.ts'],
        });

        expect(result.exitCode).toBe(0);
        expect(
          pathExists({ at: asFullPath({ dir: result.tempDir, relativePath: 'src/link-to-lib.ts' }) }),
        ).toBe(false);
        // symlink IS in trash as symlink (use isSymlink since symlink target is relative and broken in trash)
        const trashLink = asFullPath({
          dir: result.tempDir,
          relativePath: `${trashRel}/src/link-to-lib.ts`,
        });
        expect(isSymlink({ at: trashLink })).toBe(true);
        // target still exists
        expect(
          pathExists({ at: asFullPath({ dir: result.tempDir, relativePath: 'lib/utils.ts' }) }),
        ).toBe(true);
        expect(result.stdout).not.toContain('(not trackable)');
        expect(result.stdout).toContain('🥥');
        expect(sanitizeOutput(result.stdout)).toMatchSnapshot();
        expect(sanitizeOutput(result.stderr)).toMatchSnapshot();
      });
    });

    when('[t8] nested not trackable subdirectory inside trackable directory', () => {
      then('trackable files trashed, not trackable subdir direct deleted', () => {
        const result = givenTempGitRepoWithFilesAndRmsafe({
          files: {
            '.gitignore': '.cache/\n',
            'src/index.ts': 'export {}',
            'src/.cache/temp.json': '{"cached": true}',
            'src/.cache/data.bin': 'binary',
          },
          symlinks: {},
          rmsafeArgs: ['-r', './src'],
        });

        expect(result.exitCode).toBe(0);
        expect(
          pathExists({ at: asFullPath({ dir: result.tempDir, relativePath: 'src' }) }),
        ).toBe(false);
        // trackable file in trash
        expect(
          pathExists({ at: asFullPath({ dir: result.tempDir, relativePath: `${trashRel}/src/index.ts` }) }),
        ).toBe(true);
        // not trackable .cache/ contents NOT in trash
        expect(
          pathExists({ at: asFullPath({ dir: result.tempDir, relativePath: `${trashRel}/src/.cache/temp.json` }) }),
        ).toBe(false);
        expect(
          pathExists({ at: asFullPath({ dir: result.tempDir, relativePath: `${trashRel}/src/.cache/data.bin` }) }),
        ).toBe(false);
        expect(sanitizeOutput(result.stdout)).toMatchSnapshot();
        expect(sanitizeOutput(result.stderr)).toMatchSnapshot();
      });
    });

    when('[t9] glob matches only trackable files (gitignore present)', () => {
      then('all files go to trash, no not trackable label', () => {
        const result = givenTempGitRepoWithFilesAndRmsafe({
          files: {
            // gitignore exists but doesn't match the glob targets
            '.gitignore': 'node_modules/\n*.log\n',
            'src/a.ts': 'export const a = 1',
            'src/b.ts': 'export const b = 2',
            'src/c.ts': 'export const c = 3',
          },
          symlinks: {},
          rmsafeArgs: ['--path', 'src/*.ts'],
        });

        expect(result.exitCode).toBe(0);
        expect(
          pathExists({ at: asFullPath({ dir: result.tempDir, relativePath: 'src/a.ts' }) }),
        ).toBe(false);
        expect(
          pathExists({ at: asFullPath({ dir: result.tempDir, relativePath: 'src/b.ts' }) }),
        ).toBe(false);
        expect(
          pathExists({ at: asFullPath({ dir: result.tempDir, relativePath: 'src/c.ts' }) }),
        ).toBe(false);
        // all trackable files in trash
        expect(
          pathExists({ at: asFullPath({ dir: result.tempDir, relativePath: `${trashRel}/src/a.ts` }) }),
        ).toBe(true);
        expect(
          pathExists({ at: asFullPath({ dir: result.tempDir, relativePath: `${trashRel}/src/b.ts` }) }),
        ).toBe(true);
        expect(
          pathExists({ at: asFullPath({ dir: result.tempDir, relativePath: `${trashRel}/src/c.ts` }) }),
        ).toBe(true);
        // no not trackable label (all files are trackable)
        expect(result.stdout).not.toContain('(not trackable)');
        // coconut hint shown (trash was used)
        expect(result.stdout).toContain('🥥');
        expect(sanitizeOutput(result.stdout)).toMatchSnapshot();
        expect(sanitizeOutput(result.stderr)).toMatchSnapshot();
      });
    });

    when('[t10] symlink trackable path points to not trackable target', () => {
      then('symlink goes to trash based on symlink path (not target)', () => {
        const result = givenTempGitRepoWithFilesAndRmsafe({
          files: {
            '.gitignore': 'cache/\n',
            'cache/data.json': '{"cached": true}',
          },
          // symlink is in trackable location (src/) but points to not trackable target (cache/)
          symlinks: { 'src/link-to-cache.json': '../cache/data.json' },
          rmsafeArgs: ['./src/link-to-cache.json'],
        });

        expect(result.exitCode).toBe(0);
        expect(
          pathExists({ at: asFullPath({ dir: result.tempDir, relativePath: 'src/link-to-cache.json' }) }),
        ).toBe(false);
        // symlink IS in trash (based on symlink path, not target)
        const trashLink = asFullPath({
          dir: result.tempDir,
          relativePath: `${trashRel}/src/link-to-cache.json`,
        });
        expect(isSymlink({ at: trashLink })).toBe(true);
        // not trackable target still exists
        expect(
          pathExists({ at: asFullPath({ dir: result.tempDir, relativePath: 'cache/data.json' }) }),
        ).toBe(true);
        // symlink path is trackable, so no not trackable label
        expect(result.stdout).not.toContain('(not trackable)');
        // coconut hint shown (trash was used)
        expect(result.stdout).toContain('🥥');
        expect(sanitizeOutput(result.stdout)).toMatchSnapshot();
        expect(sanitizeOutput(result.stderr)).toMatchSnapshot();
      });
    });

    when('[t11] file is tracked AND matches gitignore pattern', () => {
      then('git is authoritative: tracked file goes to trash', () => {
        // .note = rare edge case where file was tracked before .gitignore existed
        //         git ls-files --cached includes tracked files regardless of .gitignore
        //         tracked files → always go to trash (recoverable)
        const result = givenTrackedAndGitIgnoredFileAndRmsafe({
          fileName: 'debug.log',
          content: 'debug output',
          gitignorePattern: '*.log\n',
          rmsafeArgs: ['./debug.log'],
        });

        expect(result.exitCode).toBe(0);
        expect(
          pathExists({ at: asFullPath({ dir: result.tempDir, relativePath: 'debug.log' }) }),
        ).toBe(false);
        // tracked file goes to trash (git is the source of truth)
        expect(
          pathExists({ at: asFullPath({ dir: result.tempDir, relativePath: `${trashRel}/debug.log` }) }),
        ).toBe(true);
        // no "not trackable" label (file is trackable per git)
        expect(result.stdout).not.toContain('(not trackable)');
        // coconut hint shown (trash was used)
        expect(result.stdout).toContain('🥥');
        expect(sanitizeOutput(result.stdout)).toMatchSnapshot();
        expect(sanitizeOutput(result.stderr)).toMatchSnapshot();
      });
    });

    when('[t12] directory has tracked file that also matches gitignore', () => {
      then('git is authoritative: tracked file goes to trash', () => {
        // .note = tests directory removal path for tracked+gitignored edge case
        //         git ls-files --cached includes tracked files regardless of .gitignore
        //         tracked files → always go to trash (recoverable)
        const result = givenTrackedAndGitIgnoredFileInDirAndRmsafe({
          dirName: 'src',
          fileName: 'debug.log',
          content: 'debug output',
          gitignorePattern: '*.log\n',
          rmsafeArgs: ['-r', './src'],
        });

        expect(result.exitCode).toBe(0);
        expect(
          pathExists({ at: asFullPath({ dir: result.tempDir, relativePath: 'src' }) }),
        ).toBe(false);
        // tracked file goes to trash (git is the source of truth)
        expect(
          pathExists({ at: asFullPath({ dir: result.tempDir, relativePath: `${trashRel}/src/debug.log` }) }),
        ).toBe(true);
        // coconut hint shown (trash was used)
        expect(result.stdout).toContain('🥥');
        expect(sanitizeOutput(result.stdout)).toMatchSnapshot();
        expect(sanitizeOutput(result.stderr)).toMatchSnapshot();
      });
    });
  });
});

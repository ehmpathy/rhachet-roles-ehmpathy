/**
 * @jest-config-loader esbuild-register
 */
import type { Config } from 'jest';

// ensure tests run in utc, like they will on cicd and on server; https://stackoverflow.com/a/56277249/15593329
process.env.TZ = 'UTC';

// ensure tests run like on local machines, so snapshots are equal on local && cicd
process.env.FORCE_COLOR = 'true';

// https://jestjs.io/docs/configuration
const config: Config = {
  verbose: true,
  reporters: [
    ['default', { summaryThreshold: 0 }], // ensure we always get a failure summary at the bottom, to avoid the hunt
    ['test-fns/slowtest.reporter.jest', { slow: '10s', output: '.log/slowtest/integration.report.json' }],
  ],
  testEnvironment: 'node',
  moduleFileExtensions: ['js', 'ts'],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/$1',
    '^@src/(.*)$': '<rootDir>/src/$1',
  },
  transform: {
    '^.+\\.(t|j)sx?$': '@swc/jest',
  },
  transformIgnorePatterns: [
    // here's an example of how to ignore esm module transformation, when needed
    // 'node_modules/(?!(@octokit|universal-user-agent|before-after-hook)/)',
  ],
  testMatch: [
    '**/*.integration.test.ts',
    '**/*._.intg.test.ts', // the `._.` kind seam; both suffix forms match
    '!**/.agent/.actors/**', // rhachet host-local state; holds a scratch clone of this repo, whose suites are not ours
    '!**/.agent/.cache/**',
    '!**/.yalc/**',
    '!**/.scratch/**',

    // kernelization moves to rhachet-roles-bhrain, which owns its tests from there on; its
    // brain-graded suites run no more here, so their flakes cannot gate this repo's release.
    // .note = these live in testMatch, never testPathIgnorePatterns: the ci shards pass
    //         --testPathIgnorePatterns on the cli, which replaces the config's list whole
    '!**/src/domain.operations/kernelize/**',
    '!**/src/domain.roles/librarian/skills/cluster/cluster.integration.test.ts',
    '!**/src/domain.roles/librarian/skills/brief.compress/extractKernels.integration.test.ts',
    '!**/src/domain.roles/librarian/skills/brief.condense/domain.operations/verify/checkRetention.integration.test.ts',
    '!**/src/domain.roles/librarian/skills/brief.condense/domain.operations/verify/restoreKernels.integration.test.ts',

    // the git.pull.* real-api cases write to a live pr, so they need a github write
    // credential; ci grants none (no write scope for a test job), so they run only by hand:
    //   npx jest -c jest.integration.config.ts --testMatch '<rootDir>/src/domain.roles/mechanic/skills/git.pull.comment/git.pull.comment.real.integration.test.ts'
    //   GIT_PULL_REAL_TARGET='<owner/repo>#<n>' npx jest -c jest.integration.config.ts --testMatch '<rootDir>/src/domain.roles/mechanic/skills/git.pull/git.pull.real.integration.test.ts'
    '!**/src/domain.roles/mechanic/skills/git.pull.comment/git.pull.comment.real.integration.test.ts',
    '!**/src/domain.roles/mechanic/skills/git.pull/git.pull.real.integration.test.ts',

    // the set.package real-registry block cases post to the live npm advisory api, whose
    // count and titles drift; they run only by hand, so drift cannot redden ci:
    //   npx jest -c jest.integration.config.ts --testMatch '<rootDir>/src/domain.roles/mechanic/skills/set.package/set.package.*.real.integration.test.ts'
    '!**/src/domain.roles/mechanic/skills/set.package/set.package.install.real.integration.test.ts',
    '!**/src/domain.roles/mechanic/skills/set.package/set.package.upgrade.real.integration.test.ts',

    // the live-brain suites need an OPENROUTER_API_KEY and call a paid, nondeterministic brain;
    // they are gated off by default so the keyless tiers run green on any host. run by hand:
    //   npx jest -c jest.integration.config.ts --testMatch '<rootDir>/src/domain.operations/guardBorder/imagineIsContentAdmissible.integration.test.ts'
    //   npx jest -c jest.integration.config.ts --testMatch '<rootDir>/src/domain.roles/librarian/skills/brief.condense/domain.operations/press/pressViaPipeline.integration.test.ts'
    '!**/src/domain.operations/guardBorder/imagineIsContentAdmissible.integration.test.ts',
    '!**/src/domain.roles/librarian/skills/brief.condense/domain.operations/press/pressViaPipeline.integration.test.ts',
  ],
  // skip all of `.agent/`: rhachet roles, host-local clones, and the rmsafe trash live there. a test
  // there would run as ours, and a snapshot there would read as obsolete (the haste map scans it)
  testPathIgnorePatterns: ['/node_modules/', '/.agent/'],
  modulePathIgnorePatterns: ['<rootDir>/.agent/'],
  setupFilesAfterEnv: ['./jest.integration.env.ts'],

  // reclaim every temp dir genTempDir made this run (test-fns autoprune). jest needs BOTH keys;
  // one without the other stamps and never reclaims. the globalSetup COMPOSES the livedb wake
  // (resume the shared aurora-serverless cluster before the first query) with autoprune's setup,
  // and forwards globalConfig to it — a bare 'test-fns/autoprune.setup.jest' would leave the db
  // un-woken.
  globalSetup: './jest.integration.prepare.ts',
  globalTeardown: 'test-fns/autoprune.teardown.jest',

  // use 50% of threads to leave headroom for other processes
  maxWorkers: '50%', // https://stackoverflow.com/questions/71287710/why-does-jest-run-faster-with-maxworkers-50
};

// eslint-disable-next-line import/no-default-export
export default config;

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
    [
      'test-fns/slowtest.reporter.jest',
      {
        slow: '10s', // threshold for integration tests
        output: '.slowtest/integration.report.json', // json report for ci shard optimization
      },
    ],
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
  // .agent/ holds no tracked tests; it holds caches and each actor's brain dir,
  // whose plugin caches ship their own foreign test suites
  testMatch: [
    '**/*.integration.test.ts',
    '!**/.yalc/**',
    '!**/.scratch/**',
    '!**/.agent/**',

    // kernelization moves to rhachet-roles-bhrain, which owns its tests from there on; its
    // brain-graded suites run no more here, so their flakes cannot gate this repo's release.
    // .note = these live in testMatch, never testPathIgnorePatterns: the ci shards pass
    //         --testPathIgnorePatterns on the cli, which replaces the config's list whole
    '!**/src/domain.operations/kernelize/**',
    '!**/src/domain.roles/librarian/skills/cluster/cluster.integration.test.ts',
    '!**/src/domain.roles/librarian/skills/brief.compress/extractKernels.integration.test.ts',
    '!**/src/domain.roles/librarian/skills/brief.condense/domain.operations/verify/checkRetention.integration.test.ts',
    '!**/src/domain.roles/librarian/skills/brief.condense/domain.operations/verify/restoreKernels.integration.test.ts',
  ],
  setupFilesAfterEnv: ['./jest.integration.env.ts'],

  // use 50% of threads to leave headroom for other processes
  maxWorkers: '50%', // https://stackoverflow.com/questions/71287710/why-does-jest-run-faster-with-maxworkers-50
};

// eslint-disable-next-line import/no-default-export
export default config;

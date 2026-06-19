import { execSync } from 'child_process';

import type { DeclastructProvider } from 'declastruct';
import { getDeclastructGithubProvider } from 'declastruct-github';
import type { DomainEntity } from 'domain-objects';
import { UnexpectedCodePathError } from 'helpful-errors';

import { getResourcesOfAppSeaturtleByEhmpathy } from './resources.app.seaturtle-by-ehmpathy';

/**
 * .what = grabs github token from keyrack (admin scope)
 * .why = no env vars, credentials managed via keyrack
 */
const getGithubTokenFromKeyrack = (): string => {
  // try env var first (for CI or manual override)
  if (process.env.GITHUB_TOKEN) return process.env.GITHUB_TOKEN;

  // otherwise grab from keyrack
  try {
    const token = execSync(
      'rhx keyrack get --owner admin --env prod --key GITHUB_TOKEN --value --allow-dangerous',
      { encoding: 'utf-8', stdio: ['pipe', 'pipe', 'pipe'] },
    ).trim();
    if (!token)
      throw new UnexpectedCodePathError('keyrack returned empty token');
    return token;
  } catch (error) {
    throw new UnexpectedCodePathError(
      'failed to get GITHUB_TOKEN from keyrack. run: rhx keyrack unlock --owner admin --env prod --key GITHUB_TOKEN',
      { cause: error instanceof Error ? error : undefined },
    );
  }
};

/**
 * .what = declastruct provider configuration for github apps
 * .why = enables declastruct CLI to interact with GitHub API
 */
export const getProviders = async (): Promise<DeclastructProvider[]> => [
  getDeclastructGithubProvider(
    {
      credentials: {
        token: getGithubTokenFromKeyrack(),
      },
    },
    {
      log: {
        info: () => {},
        debug: () => {},
        warn: console.warn,
        error: console.error,
      },
    },
  ),
];

/**
 * .what = all github app resource declarations
 * .why = composes all app resources for unified provision
 */
export const getResources = async (): Promise<DomainEntity<any>[]> => {
  // gather all app resources
  const resourcesOfAppSeaturtleByEhmpathy =
    await getResourcesOfAppSeaturtleByEhmpathy();

  return [
    // app for mechanic role github operations
    ...resourcesOfAppSeaturtleByEhmpathy,
  ];
};

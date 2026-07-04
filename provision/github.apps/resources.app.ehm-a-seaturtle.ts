import type { DeclaredResource } from 'declastruct';
import {
  DeclaredGithubApp,
  DeclaredGithubAppInstallation,
  DeclaredGithubOwner,
} from 'declastruct-github';

/**
 * .what = declares the ehm-a-seaturtle app resources
 * .why = enables mechanic role to push commits, create PRs, watch CI
 */
export const getResourcesOfAppEhmASeaturtle = async (): Promise<
  DeclaredResource[]
> => {
  // declare the owner
  const owner = new DeclaredGithubOwner({
    type: 'organization',
    slug: 'ehmpathy',
  });

  // declare the app
  const app = DeclaredGithubApp.as({
    owner,
    slug: 'ehm-a-seaturtle',
    name: 'Ehm a Seaturtle',
    description:
      'rise the tide, lift all ships\n\nthis app grants seaturtle@ehmpath.com the auth required to reliably and securely surf in ready to ship prs 🐢🌊',
    homepageUrl: 'https://github.com/ehmpathy/rhachet-roles-ehmpathy',
    public: true,

    // narrow permissions scoped to mechanic workflow
    permissions: {
      repository: {
        // git.commit.push, git.release — create PRs, enable automerge
        pullRequests: 'write',

        // show.gh.action.logs, show.gh.test.errors — view workflow runs
        actions: 'read',

        // git.repo.get — read file contents across repos
        contents: 'read',

        metadata: 'read', // always required
      },
      organization: {},
    },
    events: [],
    webhookUrl: null,
  });

  // declare the installation on ehmpathy org, all repositories
  const installation = DeclaredGithubAppInstallation.as({
    app: { owner, slug: app.slug },
    target: owner,
    repositorySelection: 'all',
    repositories: [],
  });

  return [app, installation];
};

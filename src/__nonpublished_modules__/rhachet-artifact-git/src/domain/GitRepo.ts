import { DomainEntity } from 'domain-objects';

import { GitCommit } from './GitCommit';
import { GitFileVersionRef } from './GitFile';

export interface GitRepo {
  /**
   * .what = a unique, readable identifier assigned to the repo
   */
  slug: string;

  local: {
    uri: string;
    branch: string;
    commit: GitCommit;
    diffed: GitFileVersionRef[];
    staged: GitFileVersionRef[];
  };

  remote: {
    uri: string;
    trunk: string;
    commit: GitCommit;
  };
}
export class GitRepo extends DomainEntity<GitRepo> implements GitRepo {
  public static unique = ['slug'] as const;
}

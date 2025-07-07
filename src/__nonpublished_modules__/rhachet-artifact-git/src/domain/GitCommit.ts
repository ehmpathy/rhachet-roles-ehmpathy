import { DomainLiteral } from 'domain-objects';

/**
 * .what = a specific commit in a Git repository
 * .why = represents a fixed snapshot of the repository’s state, used for version control, diffing, and audit
 */
export interface GitCommit {
  /**
   * .what = the message describing the commit
   * .why = communicates the purpose or rationale behind the code change
   */
  message: string;

  /**
   * .what = the hash that identifies the commit
   * .why = uniquely determines this commit in the Git history graph
   */
  hash: string;
}

export class GitCommit extends DomainLiteral<GitCommit> implements GitCommit {
  /**
   * .what = enforces uniqueness of commits by their hash
   * .why = Git commits are identified by their content-hash; no two should share the same hash
   */
  public static unique = ['hash'] as const;
}

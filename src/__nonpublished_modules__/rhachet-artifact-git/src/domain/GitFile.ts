import { DomainEntity } from 'domain-objects';

/**
 * .what = a git accessible file that may be stored locally or in the cloud
 * .why = represents a unit of code, config, or content to be accessed or modified during a weave
 */
export interface GitFile {
  /**
   * .what = the file path or identifier
   * .why = uniquely locates the file within its host (e.g., absolute path or cloud key)
   */
  uri: string;

  /**
   * .what = the hash of the file content
   * .why = used for change detection, integrity checks, and caching
   */
  hash: string;

  /**
   * .what = the content of the file
   * .why = enables manipulation, transformation, or review of the file's actual body
   */
  content: string; // todo: support non strings
}
export class GitFile extends DomainEntity<GitFile> implements GitFile {
  public static primary = ['uri'] as const;
  public static unique = ['uri'] as const;
}

/**
 * .what = a reference to a specific version of a Git file
 * .why = enables pointing to exact file states across commits, diffs, or branches
 */
export type GitFileVersionRef = Pick<GitFile, 'uri' | 'hash'>;

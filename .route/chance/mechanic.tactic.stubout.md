template:

given

context:
- contract.stitcher.definitions.md
- contract.stitcher.examples.md
- .route/choice/${latest}


then:
- propose ${fileName}


----

ensure that the stubout captures the requirements, in a way that makes it easy for the <fillout>[critic] to review



----

directive
- <study> the [ask]
  - input = ask
  - output = json({ claims: { assumptions, questions }, cases: { use: { who, when, what }[], test: { form = 'positive' | 'negative', given, then, because } }})
- do not execute the [ask]

context.role.traits
- systematically distill scenes with ubiquitous language
- uses treestructs and bullet points to maximize signal-to-noise

context.role.skills
- tactic: <study>(ask) to determine the contract and requirements to declare in stubout
  - declare the assumptions and questions that you have
  - ask the assumptions and questions
  - produce a [[pool]] of [[case:use]], usecases to support
  - produce a [[pool]] of [[case:test]], test cases to implement
  - output = json({ claims: { assumptions, questions }, cases: { use: { who, when, what }[], test: { form = 'positive' | 'negative', given, then, because } }})
- tactic: <declare>([case:use])
  - specify a usecase in terms of .input, .output, .frequency
  - look for functional boundary cases and frequent cases
- tactic: <declare>([case:test])
  - specify a usecase in terms of .input, .output, .type='positive'|'negative'
  - look for hazards that could exist based on the contract or assumptions

context.scene
- definition of Artifact
    ```ts
      /**
      * .what = an artifact that can be leveraged throughout a weave
      * .why =
      * .cases =
      *   - iterate on a particular file
      *   - write to a particular repo
      *   - etc
      */
      export interface Artifact<TRefable extends Refable<any, any, any>> {
        ref: RefByUnique<TRefable>;
        get: () => Promise<InstanceType<TRefable>>;
        set: () => Promise<InstanceType<TRefable>>;
      }
    ```

- definition of GitFile
    ```ts
      import { DomainEntity } from 'domain-objects';

      /**
      * .what = a git accessible file that may be stored locally or in the cloud
      * .why = represents a unit of code, config, or content to be accessed or modified during a weave
      *
      * todo: split file io vs git file io? or is git format a generic enough usecase; the Git prefix is a nice namespace to avoid import collisions
      */
      export interface GitFile<TContent = string> {
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
        content: TContent;
      }
      export class GitFile<TContent = string>
        extends DomainEntity<GitFile<TContent>>
        implements GitFile<TContent>
      {
        public static primary = ['uri'] as const;
        public static unique = ['uri'] as const;
      }

      /**
      * .what = a reference to a specific version of a Git file
      * .why = enables pointing to exact file states across commits, diffs, or branches
      */
      export type GitFileVersionRef = Pick<GitFile, 'uri' | 'hash'>;
    ```

- existence of gitFileGet and gitFileSet
  ```ts
    /**
    * .what = loads the content of a GitFile from disk or cloud
    * .why = enables artifact.get() resolution during a weave
    */
    export const gitFileGet = async (input: {
      ref: RefByUnique<typeof GitFile>;
    }): Promise<GitFile>

    /**
    * .what = writes the content of a GitFile to disk or cloud
    * .why = enables artifact.set() resolution during a weave
    */
    export const gitFileSet = async (input: {
      ref: RefByUnique<typeof GitFile>;
      content: string;
    }): Promise<GitFile>
  ```


directive
- <study> the [ask]
  - input = ask
  - output = json({ claims: { assumptions, questions }, cases: { use: { who, when, what }[], test: { form = 'positive' | 'negative', given, then, because } }})
- do not execute the [ask]


---

ask = declare a stubout for genArtifactGitFile

input = "uri", output = Artifact<typeof GitFile<TContent = string>>

purpose = make it easy to create a new git file artifacts

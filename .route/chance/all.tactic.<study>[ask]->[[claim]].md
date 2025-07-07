
example flow


# 1. <study><distill>[ask]

  directive
  - <study><distill> the [ask]
    - input = ask
    - output = json({ claims: { lessons, assumptions, questions }, cases: { use: { who, when, what }[], test: { form = 'positive' | 'negative', given, when, then, because } }})
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
    - output =
    ```json
    {
       claims: { lessons, assumptions, questions },
       cases: {
        use: { who, when, what }[],
        test: { form = 'positive' | 'negative', given, when, then, because }[]
      }
    }
    ```
  - tactic: <declare>([case:use])
    - specify in terms of { who, when, what }
    - look for functional boundary cases and frequent cases
  - tactic: <declare>([case:test])
    - specify in terms of { form = 'positive' | 'negative', given, when, then, because }
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
    - output = json({ claims: { lessons, assumptions, questions }, cases: { use: { who, when, what }[], test: { form = 'positive' | 'negative', given, when, then, because } }})
  - do not execute the [ask]


  ---

  ask = declare a stubout for genArtifactGitFile

  input = "uri", output = Artifact<typeof GitFile<TContent = string>>

  purpose = make it easy to create a new git file artifacts



===>


{
  "claims": {
    "lessons": [
      "Artifact should act as a proxy to deferred get/set of a GitFile, not own its state.",
      "GitFile’s uniqueness is determined by `uri`; content and hash are version details.",
      "Artifact encapsulates access patterns (read/write) for a GitFile in a weave context."
    ],
    "assumptions": [
      "`genArtifactGitFile` accepts a `uri` and returns an Artifact wrapping the GitFile.",
      "The GitFile does not need to exist yet; `get()` may error if not present.",
      "The content used in `set()` will be provided later through the weave execution.",
      "The returned Artifact uses `gitFileGet` and `gitFileSet` under the hood."
    ],
    "questions": [
      "Should `get()` error if the file doesn't exist, or return a default GitFile?",
      "Should `set()` store both uri and content, or is it stateless until called?",
      "Will the `hash` field be recomputed by `gitFileSet`, or expected as input?"
    ]
  },
  "cases": {
    "use": [
      {
        "who": "weave orchestrator",
        "when": "instantiating a new file-backed artifact for future steps",
        "what": "calls genArtifactGitFile with a target uri"
      },
      {
        "who": "stitch step",
        "when": "reading the content of a known Git file",
        "what": "calls artifact.get() and receives a GitFile"
      },
      {
        "who": "stitch step",
        "when": "writing updated content to the Git file",
        "what": "calls artifact.set() and persists new content"
      }
    ],
    "test": [
      {
        "form": "positive",
        "given": "a valid uri path to a file that exists",
        "when": "calling artifact.get()",
        "then": "returns a GitFile with expected content and hash",
        "because": "get should resolve the latest state of the file"
      },
      {
        "form": "positive",
        "given": "a valid uri and new string content",
        "when": "calling artifact.set()",
        "then": "writes file and returns GitFile with updated hash",
        "because": "set should persist content and reflect integrity"
      },
      {
        "form": "negative",
        "given": "an invalid or non-existent file path",
        "when": "calling artifact.get()",
        "then": "throws or rejects with an error",
        "because": "the file does not yet exist on disk"
      },
      {
        "form": "negative",
        "given": "set is called without providing content",
        "when": "executing set()",
        "then": "throws an error or fails",
        "because": "content is required to persist"
      }
    ]
  }
}



===>

"no initial state. genArtifact is just a reference to a file w/ sdk of get and set"


====>

GitFile<TContent = string>

lets propogate TContent through as a generic

====>

{
  "claims": {
    "lessons": [
      "genArtifactGitFile produces a lightweight reference, not a loaded file.",
      "The Artifact object is stateless and defers resolution to get/set calls.",
      "Responsibility for fetching and persisting lies in gitFileGet/gitFileSet."
    ],
    "assumptions": [
      "genArtifactGitFile takes a uri string and returns an Artifact<{ uri: string }>.",
      "The Artifact is a proxy; it holds no file content or hash on creation.",
      "get() will retrieve the GitFile from disk or remote using `gitFileGet`.",
      "set(content) will write content using `gitFileSet` with known uri.",
      "The artifact will always be scoped to a single uri."
    ],
    "questions": [
      "Is it safe to assume `set()` always overwrites the file at that uri?",
      "Should the Artifact be memoized or cached per uri inside the weave?",
      "What should get() do if the file is missing — throw, return null, or default?"
    ]
  },
  "cases": {
    "use": [
      {
        "who": "workflow author",
        "when": "declaring an editable file location for a future weave step",
        "what": "calls genArtifactGitFile with the target uri"
      },
      {
        "who": "stitch step",
        "when": "loading the file at a known uri",
        "what": "calls artifact.get() to fetch GitFile contents"
      },
      {
        "who": "stitch step",
        "when": "saving updated contents",
        "what": "calls artifact.set() with new content"
      }
    ],
    "test": [
      {
        "form": "positive",
        "given": "an existing file at a known uri",
        "when": "calling get() from the artifact",
        "then": "resolves the GitFile with correct content and hash",
        "because": "gitFileGet should load the current state"
      },
      {
        "form": "positive",
        "given": "an artifact created with a uri and some new content",
        "when": "calling set()",
        "then": "persists the content and returns the updated GitFile",
        "because": "gitFileSet should handle the write operation"
      },
      {
        "form": "negative",
        "given": "a non-existent file path",
        "when": "calling get()",
        "then": "throws or rejects with file-not-found error",
        "because": "get assumes the file exists"
      },
      {
        "form": "negative",
        "given": "invalid uri (e.g. empty string or malformed)",
        "when": "calling either get() or set()",
        "then": "throws validation or resolution error",
        "because": "uri must be valid to resolve or persist content"
      }
    ]
  }
}



===>

{
  "claims": {
    "lessons": [
      "GitFile is generic over TContent, defaulting to string.",
      "genArtifactGitFile should accept and preserve TContent in its return type.",
      "Artifact.get returns GitFile<TContent> | null, and set accepts TContent."
    ],
    "assumptions": [
      "genArtifactGitFile<TContent = string>(uri: string): Artifact<typeof GitFile<TContent>>",
      "Artifact.ref = { uri } as RefByUnique<typeof GitFile<TContent>>",
      "get(): Promise<GitFile<TContent> | null>",
      "set(content: TContent): Promise<GitFile<TContent>>"
    ],
    "questions": [
      "Is TContent always serializable to disk (e.g., stringifiable)?",
      "Should gitFileSet compute the hash based on raw or stringified content?"
    ]
  },
  "cases": {
    "use": [
      {
        "who": "developer writing structured data",
        "when": "persisting a typed config as JSON",
        "what": "calls genArtifactGitFile<MyConfig>(uri) with TContent = MyConfig"
      },
      {
        "who": "a weave step working with markdown files",
        "when": "declaring artifact to load/edit markdown",
        "what": "uses genArtifactGitFile<string>(uri) with default TContent"
      },
      {
        "who": "consumer of artifact",
        "when": "loading structured content",
        "what": "calls get(): Promise<GitFile<TContent> | null>"
      },
      {
        "who": "consumer of artifact",
        "when": "saving structured content",
        "what": "calls set(content: TContent): Promise<GitFile<TContent>>"
      }
    ],
    "test": [
      {
        "form": "positive",
        "given": "TContent = string and uri exists",
        "when": "calling get()",
        "then": "returns GitFile<string>",
        "because": "default case should resolve plain text content"
      },
      {
        "form": "positive",
        "given": "TContent = Record<string, any> and content is an object",
        "when": "calling set()",
        "then": "writes content and returns GitFile<TContent>",
        "because": "generic propagation must be preserved"
      },
      {
        "form": "negative",
        "given": "TContent = object but file contains invalid JSON",
        "when": "calling get()",
        "then": "throws or returns malformed data",
        "because": "content may not match the expected structure"
      },
      {
        "form": "negative",
        "given": "content is undefined",
        "when": "calling set()",
        "then": "throws or rejects",
        "because": "content must be valid TContent to persist"
      }
    ]
  }
}

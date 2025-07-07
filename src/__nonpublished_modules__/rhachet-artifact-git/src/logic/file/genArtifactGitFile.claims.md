{
  "claims": {
    "lessons": [
      "Artifact.set requires an object input: `{ content: TContent }`.",
      "This mirrors gitFileSet’s input shape: `{ ref, content }`.",
      "TContent is preserved from the generic argument to GitFile."
    ],
    "assumptions": [
      "genArtifactGitFile<TContent = string>(uri: string): Artifact<typeof GitFile<TContent>>",
      "Artifact.ref = { uri }",
      "Artifact.get(): Promise<GitFile<TContent> | null>",
      "Artifact.set({ content }: { content: TContent }): Promise<GitFile<TContent>>"
    ],
    "questions": [
      "Should `.set()` allow partial updates like patching content, or is full replace the only supported mode?",
      "Is TContent required to be serializable or checksum-able to support hashing?"
    ]
  },
  "cases": {
    "use": [
      {
        "who": "a weave planner",
        "when": "declaring a typed GitFile artifact for future mutation",
        "what": "calls genArtifactGitFile<MyData>(uri) and later set({ content })"
      },
      {
        "who": "step logic author",
        "when": "writing new structured content",
        "what": "calls artifact.set({ content })"
      }
    ],
    "test": [
      {
        "form": "positive",
        "given": "TContent = string and valid file uri",
        "when": "calling set({ content: 'new string' })",
        "then": "writes and returns GitFile<string>",
        "because": "simple overwrite of string content should succeed"
      },
      {
        "form": "positive",
        "given": "TContent = object and valid structured data",
        "when": "calling set({ content: myObj })",
        "then": "writes and returns GitFile<typeof myObj>",
        "because": "set should handle structured content as TContent"
      },
    ]
  }
}

1. {define Role and Skill types}
   .why
      .needed: establishes the foundational types used throughout the CLI, skill runners, and registry
      .ordered: required before role registry, orchestration, or CLI interaction can be built
   .where
      .layer: domain
      .pathExample: src/domain/objects/Role.ts
   .what
     .contract.desired
       input = none
       output = { Role, Skill } types with `slug`, `readme`, and `skills`
     .change.required
       - create `Skill` type: `{ slug: string; description: string }`
       - create `Role` type: `{ slug: string; readme: string; skills: Record<string, Skill> }`

---

2. {define static role registry with stubbed skill runners}
   .why
      .needed: provides a central catalog for listing and invoking role+skill behaviors
      .ordered: depends on domain types being defined; required before orchestration and CLI commands
   .where
      .layer: logic
      .pathExample: src/logic/registry/roleRegistry.ts
   .what
     .contract.desired
       input = none
       output = Record<string, Role & { skills: Record<string, { run: fn }> }>
     .change.required
       - manually define a few sample roles (e.g. `mechanic`, `critic`) with stub `run()` implementations
       - co-locate `run()` functions with registry or lazy-load if needed

---

3. {implement runSkill orchestrator}
   .why
      .needed: unifies role/skill invocation into a clean interface usable by CLI or other callers
      .ordered: requires role registry to resolve runner functions
   .where
      .layer: logic
      .pathExample: src/logic/runSkill.ts
   .what
     .contract.desired
       input = { role: string; skill: string; target?: Artifact<typeof GitFile>; ask?: string }
       output = result of the invoked skill (any | void)
     .change.required
       - lookup role and skill from registry
       - validate that skill has a `.run()` function
       - execute `.run({ target, ask })`

---

4. {create listRoles command}
   .why
      .needed: lets users explore available roles and skills via CLI
      .ordered: depends on registry being available and structured
   .where
      .layer: contract
      .pathExample: src/contract/commands/rhachet/listRoles.ts
   .what
     .contract.desired
       input = { role?: string }
       output = prints role or skill list to terminal
     .change.required
       - read role registry
       - if role arg passed: print that role’s skills
       - else: print all roles and top-level descriptions

---

5. {create invokeSkill command}
   .why
      .needed: enables CLI to actually run real skill logic
      .ordered: requires runSkill orchestrator to be implemented
   .where
      .layer: contract
      .pathExample: src/contract/commands/rhachet/invokeSkill.ts
   .what
     .contract.desired
       input = { role: string; skill: string; ask?: string; target?: string }
       output = runs and prints result or error
     .change.required
       - parse args
       - optionally load `Artifact<typeof GitFile>` from target path
       - call `runSkill` with parsed inputs

---

6. {implement runCLI entrypoint}
   .why
      .needed: central router that parses CLI args and dispatches to correct subcommand
      .ordered: depends on listRoles and invokeSkill existing
   .where
      .layer: contract
      .pathExample: src/contract/commands/rhachet/runCLI.ts
   .what
     .contract.desired
       input = process.argv
       output = CLI dispatch to list or invoke
     .change.required
       - use `yargs` to define commands and options
       - route `list` → listRoles, default → invokeSkill

---

7. {expose CLI via npx}
   .why
      .needed: allows devs to run the CLI with `npx rhachet`, completing external interface
      .ordered: final step; depends on full CLI functionality
   .where
      .layer: root
      .pathExample: package.json, bin/rhachet
   .what
     .contract.desired
       input = CLI args
       output = runs `runCLI`
     .change.required
       - add `#!/usr/bin/env node` to top of `runCLI.ts` output
       - configure `bin` field in `package.json`
       - optionally add build/bundle if needed

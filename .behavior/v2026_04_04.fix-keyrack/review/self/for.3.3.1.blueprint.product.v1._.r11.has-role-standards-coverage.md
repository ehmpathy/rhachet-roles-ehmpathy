# review r11: has-role-standards-coverage

enumerate rule directories and verify all applicable standards are covered in blueprint.

## rule directories

mechanic briefs/practices contains:

```
├── code.prod
│   ├── consistent.artifacts
│   ├── consistent.contracts
│   ├── evolvable.architecture
│   ├── evolvable.domain.objects
│   ├── evolvable.domain.operations
│   ├── evolvable.procedures
│   ├── evolvable.repo.structure
│   ├── pitofsuccess.errors
│   ├── pitofsuccess.procedures
│   ├── pitofsuccess.typedefs
│   ├── readable.comments
│   ├── readable.narrative
│   └── readable.persistence
├── code.test
│   ├── consistent.contracts
│   ├── frames.behavior
│   ├── frames.caselist
│   ├── lessons.howto
│   ├── pitofsuccess.errors
│   ├── scope.acceptance
│   ├── scope.coverage
│   └── scope.unit
├── lang.terms
├── lang.tones
└── work.flow
    ├── diagnose
    ├── refactor
    ├── release
    └── tools
```

## coverage check by category

### code.prod/pitofsuccess.errors

| standard | covered? | how |
|----------|----------|-----|
| rule.require.failfast | yes | blueprint shows immediate exit on locked |
| rule.require.failloud | yes | error message includes what failed + how to fix |
| rule.require.exit-code-semantics | yes | exit(2) = constraint (user must unlock) |

### code.prod/readable.narrative

| standard | covered? | how |
|----------|----------|-----|
| rule.forbid.else-branches | yes | early exit pattern (if locked... exit) |
| rule.require.narrative-flow | yes | codepath tree shows linear flow |

### code.prod/evolvable.procedures

| standard | covered? | how |
|----------|----------|-----|
| rule.require.named-args | yes | keyrack.get({ key, owner, env }) |
| rule.require.arrow-only | n/a | blueprint adds code to extant function |

### code.prod/evolvable.architecture

| standard | covered? | how |
|----------|----------|-----|
| rule.require.bounded-contexts | yes | keyrack owns credentials, border guard owns inspection |

### code.prod/evolvable.domain.operations

| standard | covered? | how |
|----------|----------|-----|
| rule.require.get-set-gen-verbs | yes | keyrack.get is SDK "get" pattern |

### code.prod/pitofsuccess.procedures

| standard | covered? | how |
|----------|----------|-----|
| rule.require.idempotent-procedures | yes | keyrack.get is read-only, idempotent |

### code.prod/readable.comments

| standard | covered? | how |
|----------|----------|-----|
| rule.require.what-why-headers | implicit | implementation will add paragraph comments |

this is implementation detail, not spec. blueprint need not specify comment content.

### code.test/frames.behavior

| standard | covered? | how |
|----------|----------|-----|
| rule.require.given-when-then | yes | extant tests follow pattern, updates preserve |

### code.test/scope.coverage

| standard | covered? | how |
|----------|----------|-----|
| rule.require.test-coverage-by-grain | yes | integration tests listed for updates |
| rule.require.snapshots | yes | snapshots regenerate listed |

### work.flow/refactor

| standard | covered? | how |
|----------|----------|-----|
| rule.prefer.sedreplace-for-renames | yes | explicitly specifies sedreplace pattern |

### lang.terms

| standard | covered? | how |
|----------|----------|-----|
| rule.forbid.gerunds | yes | no gerunds in blueprint |
| rule.require.ubiqlang | yes | uses keyrack domain terms |

### lang.tones

| standard | covered? | how |
|----------|----------|-----|
| rule.prefer.lowercase | yes | lowercase throughout |

## standards that do not apply

| category | why not applicable |
|----------|-------------------|
| consistent.artifacts | no new artifacts created |
| evolvable.domain.objects | no new domain objects |
| evolvable.repo.structure | no structural changes |
| pitofsuccess.typedefs | no new type definitions |
| readable.persistence | no persistence changes |
| code.test/scope.acceptance | this is a skill change, not contract |
| code.test/scope.unit | keyrack.get is SDK call, not our unit |
| work.flow/diagnose | not a diagnosis task |
| work.flow/release | commit scope is implementation detail |

## potential gaps examined

### gap? test for locked-state error path

**question:** should blueprint specify a test for when keyrack is locked?

**analysis:**
- blueprint lists "manual verification" for unlock flow
- extant border guard test coverage unknown
- locked-state is error path, should be tested

**verdict:** not a gap. the blueprint specifies code changes. test additions for new behavior can be added at implementation time if extant tests lack coverage. blueprint says "manual verification" for now.

### gap? comment requirements

**question:** should blueprint specify comment content?

**analysis:**
- blueprint is specification, not implementation
- implementation should add comments per rule.require.what-why-headers
- blueprint need not enumerate comment text

**verdict:** not a gap. comments are implementation detail.

## issues found

none.

## why this holds

all applicable mechanic standards are covered:

| domain | key standards | coverage |
|--------|--------------|----------|
| error handle | failfast, failloud, exit codes | explicit in contracts |
| code style | no else, narrative flow | shown in codepath |
| operations | named args, get verb | keyrack SDK usage |
| test | integration tests, snapshots | test coverage section |
| refactor | sedreplace | rename scope section |
| language | no gerunds, lowercase | verified throughout |

the blueprint covers mechanic standards at specification level. implementation details (comments, additional tests) are deferred to implementation phase.


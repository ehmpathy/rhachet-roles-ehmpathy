# review r4: has-pruned-yagni

YAGNI = "you ain't gonna need it"

for each blueprint component: was it explicitly requested?

## component-by-component YAGNI check

### keyrack SDK call in guardBorder.onWebfetch.ts

**requested?** yes. vision: "border guard checks keyrack"

**minimum viable?** yes. single keyrack.get() call, no wrapper, no abstraction.

**YAGNI?** no.

### unlock instructions

**requested?** yes. vision: "if locked: emit unlock instructions, exit 2"

**minimum viable?** yes. one console.error, one process.exit.

**YAGNI?** no.

### XAI_API_KEY in keyrack.yml

**requested?** yes. vision: "XAI_API_KEY in env.prep"

**minimum viable?** yes. one line in YAML.

**YAGNI?** no.

### token rename (43 files)

**requested?** yes. human: "hard criteria... propogated throughout all skills"

**minimum viable?** yes. sedreplace handles bulk rename.

**YAGNI?** no.

### remove apikeys.env source

**requested?** yes. vision: "shell wrapper omits credential logic entirely"

**minimum viable?** yes. delete 3 lines.

**YAGNI?** no.

### keyrack.ehmpath.sh REQUIRED_KEYS update

**requested?** implicitly. keyrack init must know about XAI_API_KEY to prompt for it.

**minimum viable?** yes. add one key to array.

**YAGNI?** no. required for pit-of-success.

### test coverage section

**requested?** yes. blueprint format requires test coverage specification.

**minimum viable?** yes. lists affected tests without extra detail.

**YAGNI?** no.

### contracts section (copy-pasteable SDK code)

**requested?** not explicitly. this is convenience for implementer.

**minimum viable?** could be removed. implementer could read SDK docs.

**question:** is this YAGNI?

**analysis:** contracts section adds ~10 lines to blueprint. provides exact code pattern. reduces implementation ambiguity. aids review.

**decision:** keep. value exceeds cost.

### rename scope section (file list)

**requested?** not explicitly. human said "propogated throughout all skills" but did not ask for file list.

**minimum viable?** could inline "sedreplace handles 43 files" without list.

**question:** is detailed file list YAGNI?

**analysis:** file list enables:
1. verification that sedreplace found all expected files
2. review of which modules are affected
3. confidence that rename is complete

**decision:** keep. aids verification.

## YAGNI items found

none.

every component either:
1. directly requested by vision or human
2. required for correctness (REQUIRED_KEYS)
3. aids implementation/verification (contracts, file list)

## why this holds

| component | source | verdict |
|-----------|--------|---------|
| keyrack SDK | vision | required |
| unlock instructions | vision | required |
| XAI_API_KEY in yml | vision | required |
| token rename | human | required |
| remove apikeys.env | vision | required |
| REQUIRED_KEYS | correctness | required |
| test coverage | format | required |
| contracts section | convenience | keep (high value) |
| rename scope | verification | keep (aids review) |

no "while we're here" additions. no "future flexibility" abstractions. no premature optimization.

## lesson

the blueprint is tight because:
1. wish was tightly scoped
2. vision was explicit
3. no assumptions about "nice to haves"

YAGNI enforced by trace of every component to its source.

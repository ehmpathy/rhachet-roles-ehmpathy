# review r2: has-questioned-deletables

examined each feature and component in the blueprint for deletability.

## features examined

### feature 1: keyrack SDK integration in TypeScript

**traces to:** vision item "border guard checks keyrack"

**can we delete?** no. this is the core requirement.

**simplest version?** the blueprint uses keyrack SDK directly — no wrapper, no abstraction. already minimal.

### feature 2: unlock instructions on locked state

**traces to:** vision item "if locked: emit unlock instructions, exit 2"

**can we delete?** no. explicit requirement.

**simplest version?** single console.error + process.exit(2). already minimal.

### feature 3: XAI_API_KEY in keyrack.yml

**traces to:** vision item "XAI_API_KEY in env.prep"

**can we delete?** no. required for keyrack to know about the key.

**simplest version?** one line in YAML. cannot be simpler.

### feature 4: token rename across files

**traces to:** human marked as "hard criteria"

**can we delete?** no. human explicitly required this.

**simplest version?** sedreplace across 43 files. single operation.

### feature 5: remove apikeys.env source from shell hook

**traces to:** vision item "shell wrapper omits credential logic entirely"

**can we delete?** technically could keep it as fallback, but vision says "omits entirely".

**simplest version?** delete the 3 lines. already minimal.

### feature 6: keyrack.ehmpath.sh REQUIRED_KEYS update

**traces to:** research — keyrack init must prompt for XAI_API_KEY

**can we delete?** if deleted, keyrack init would not prompt for XAI_API_KEY. users would have to manually discover and fill it.

**decision:** keep. pit-of-success requires keyrack init to prompt for all required keys.

## components examined

### component 1: filediff tree

**can we delete?** no. required format for blueprint.

**simplest version?** already uses standard tree notation.

### component 2: codepath tree

**can we delete?** no. required format for blueprint.

**simplest version?** already uses standard markers.

### component 3: contracts section

**can we delete?** could inline in codepath tree, but contracts section shows copy-pasteable code. keeps blueprint useful.

**decision:** keep. aids implementation.

### component 4: rename scope section

**can we delete?** could inline in filediff tree, but 43 files would clutter it.

**decision:** keep. clarity over compactness.

### component 5: test coverage section

**can we delete?** no. required format for blueprint.

**simplest version?** already minimal.

## deletions found

none.

## why this holds

every feature traces to either:
1. explicit vision requirement
2. human's "hard criteria" statement
3. pit-of-success requirement (keyrack init)

every component is either:
1. required blueprint format
2. aids implementation clarity

the blueprint is already minimal. no optimization of non-existent components. no features beyond requirements.

## lesson

the wish was scoped tightly: fix keyrack for border guard + rename token. the blueprint delivers exactly that scope — no more, no less.

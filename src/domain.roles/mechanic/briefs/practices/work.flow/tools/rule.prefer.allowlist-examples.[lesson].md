# rule.prefer.allowlist-examples

## .what

when you add a permission to the allowlist, include explicit example variants that show real usage patterns

## .why

### permission nudges become documentation

when a mechanic hits a permission nudge, claude code shows the allowlist entries that matched. explicit examples serve as inline documentation — the mechanic sees exactly how to invoke the command correctly, right at the moment it needs to.

### reduces trial-and-error

without examples, the mechanic must guess the correct invocation. with examples, it sees:

```jsonc
"Bash(npx rhachet run --skill git.commit.set -- --message 'fix(api): validate input')",
"Bash(npx rhachet run --skill git.commit.set -- --message 'fix(api): validate input' --push)",
```

and immediately knows the shape of valid commands — message format, flag order, optional flags.

### communicates intent

the wildcard entry (`Bash(npx rhachet run --skill git.commit.set:*)`) grants access. the example entries communicate *how* the skill is meant to be used. they're the difference between "you can use this" and "here's how to use this well."

### pit of success for agents

agents are more likely to invoke commands correctly when they see concrete examples. this reduces failed attempts, permission re-prompts, and wasted tokens.

## .pattern

```jsonc
// wildcard for access
"Bash(npx rhachet run --skill my-skill:*)",

// examples for documentation
"Bash(npx rhachet run --skill my-skill -- --flag 'value')",
"Bash(npx rhachet run --skill my-skill -- --flag 'value' --optional)",
```

## .enforcement

- allowlist entries without examples for non-trivial skills = **NITPICK**

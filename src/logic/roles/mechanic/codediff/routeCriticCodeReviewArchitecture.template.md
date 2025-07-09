directive
- <critic><review><architecture> the [subject] focused on architecture violations only
  - input = [subject], [claims]
  - output = json list of suggestions
    - each suggestion must be:
      {
        kind: "blocker" | "nitpick" | "chance" | "praise",
        scope: "technical.architecture",
        what: string,
        why: string,
        where: {
          scope: 'contract' | 'implementation',
          sample: string
        },
        suggestion: {
          before: string,
          after: string,
        }
      }
    - output should be directly the .json file contents. no markdown or code blocks

context.role.traits
- think like a precise code reviewer
- optimize for signal, minimize words
$.rhachet{inherit.traits}

context.role.skills
$.rhachet{inherit.skills}

--------------------------

architecture rules to enforce:
```md
$.rhachet{architecture.rules}
```

--------------------------

architectural domain relevant:

  domain.terms established (for ubiqlang)
  ```md
  $.rhachet{architecture.domain.terms}
  ```

  domain.bounds established (for bounded contexts & separation of concerns)
  ```md
  $.rhachet{architecture.domain.bounds}
  ```

--------------------------


directive
- <critic><review><architecture> the [subject] focused on architecture violations only
  - input = [diff], [claims]
  - output = json list of suggestions
    - each suggestion must be:
      {
        kind: "blocker" | "nitpick" | "chance" | "praise",
        scope: "technical.architecture"
        what: string,
        why: string,
        where: {
          scope: 'contract' | 'implementation',
          sample: string
        },
        suggestion: {
          before: string,
          after: string,
        }
      }
    - output should be directly the .json file contents. no markdown or code blocks

--------------------------

subject =
$.rhachet{subject}

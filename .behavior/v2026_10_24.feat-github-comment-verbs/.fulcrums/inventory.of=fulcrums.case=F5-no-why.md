# F5 · no required `--why`

- fork: (a) the draft's required `--why` on set and del · (b) none
- taken: (b). the draft prints `--why` to stdout and stores it nowhere, so it records no audit; it adds a flag to every call (rule.prefer.defaults-match-common-case). the `--key` names the intent of a write
- rework: clean — add it back as optional
- confidence 70%
- where: set, del

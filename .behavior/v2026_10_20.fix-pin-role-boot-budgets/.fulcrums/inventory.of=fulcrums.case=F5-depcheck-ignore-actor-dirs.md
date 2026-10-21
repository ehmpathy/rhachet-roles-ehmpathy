# F5 — depcheck ignores `.claude` + `.agent`

- fork: (a) ignore the dirs; (b) leave lint red locally
- taken: (a). `.claude` links to the actor brain dir, which holds local plugin installs; depcheck graded a plugin's test file as this package's source
- rework: clean — two lines in `.depcheckrc.yml`
- confidence: 90%
- verdict: awaited

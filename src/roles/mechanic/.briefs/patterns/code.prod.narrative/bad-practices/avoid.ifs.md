extra ifs = extra code branches

avoid ifs maximally

in an ideal narrative,
- shapes flow through and fit nicely
- operations apply to every shape consistently

to minimize code paths and maximize simplicity

---

the only exception is early returns, since they shortcut logical branches and simply shorten the narrative
- e.g., in IFFEs
- e.g., in operations

avoid ifs that create logical branches we could have otherwise avoided

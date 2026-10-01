# F12 — an absent `rg` exits 2 (constraint), not 1 (malfunction)

- **rework**: clean — one `exit` literal and one test line
- **status**: open, best-guessed
- **confidence**: 80%
- **raised**: by peer lane `r011`
- **where**: `grepsafe.sh` — the rg-absent failfast

## .the fork

`rule.require.exit-code-semantics` has three codes. an absent `rg` sits between two:

| exit 1 — malfunction | exit 2 — constraint |
|---|---|
| *"external error"*: gh failed, network, rate limit, unexpected state | *"user must fix"*: needs rebase, no PR, bad input |
| the peer's read: an absent binary is environment state; no flag correction repairs it | my read: install ripgrep once and every later run works |

## .taken, and why

**exit 2.** the rule sorts by *"who must act?"*, not *"where does the cause sit?"*. malfunction holds
what is transient or un-actionable. an absent binary is permanent until a human acts, and the act is
one command, which the error already names (`rule.require.errors-name-the-fix`):

> `fix: install ripgrep — brew install ripgrep, or apt install ripgrep`

exit 1 invites a retry, and a retry against an absent binary loops forever. exit 2 says stop and
fix, which is true.

`[case24][t0]` asserts `.toBe(2)`. a clamp green under both answers pins no contract; this one pins
what the code does today, and changes with it if the council rules 1.

## .confidence — 80%

the house may intend 1 to mean *"the environment is not as this tool requires"*, whoever repairs it.
under that read a tool absence is the textbook case.

exit 2 now carries three senses: bad arg, engine refusal, tool absent. rule on this with that
overload in view.

## .verdict

⬜ unruled.

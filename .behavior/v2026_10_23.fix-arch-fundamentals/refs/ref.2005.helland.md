# ref.2005.helland

grade: ✅ — the conference's own pdf (cidr), text extracted from the bytes the browser received
cite: Pat Helland (2005). "Data on the Outside versus Data on the Inside." *Proceedings of the 2005 CIDR Conference*. https://www.cidrdb.org/cidr2005/papers/P12.pdf
seen: `.raw/pdf.helland2005-data-outside-inside.pdf` → `.raw/pdf.helland2005-data-outside-inside.pdf.txt` (`rhx pdf.text`) — fetched 2026-11-26 by `.playbooks/fetch-sources.play.ts`

## .quotes

> "In particular, atomic transactions with two-phase commit do not occur across multiple services because this necessitates holding locks while another service decides the outcome of the transaction."

> "To participate in an ACID transaction requires a willingness to hold database locks until the transaction coordinator decides to commit or abort the transaction. For the non-coordinator, this is a serious ceding of independence and requires a lot of trust that the coordinating system will make a decision in a timely fashion. Being constrained to hold active locks on records in the database can be devastating for the availability of a system."

> "Services encapsulate changes to their data via the application logic for the service. … It is essential that only the trusted application logic of the service perform changes to the data."

## .supports

- `pattern=two-phase-commit` (forbid) — **converge**: the concern-boundaries argument in his words ("a serious ceding of independence") and the availability argument ("devastating")
- `pattern=distributed-lock` (forbid) and the cure's one owner per resource — **converge**: only the owner's own logic changes its data

failhide = any scenario where you hide real errors

the most common patterns is

try/catch

---

the only cases where a trycatch is allowed is if the catch has an allowlist of the errors it catches and CAREFULLY handles those, while it throws the rest up

otherwise, its a failhide hazard, where real errors will be silently hidden, which leads to defects or hours of pointless debug

never failhide

always failfast

---

this is a mega blocker

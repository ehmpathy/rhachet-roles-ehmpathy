never try+catch just to hide the error

if an error is thrown

it should not be caught and hidden

it should be rethrown

---

if we want to use it for control flow logic, then we epxpect
- all errors by default to be thrown
- only errors that match very restricted conditions to be handled

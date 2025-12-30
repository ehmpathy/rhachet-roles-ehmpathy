todo: declare why dependency injection leads to a pit of success && why global shared state should be avoided

via dependency injection, you always know what references what. no side effects

persistance is the only global shared state that should exist - and even that should be managed cautiously (e.g., to avoid race conditions)

---

via dependency injection, either via context or input params, you craft safer, easier to test, and more reliable code

a significant contributor to the pit-of-success we strive for

# F07 — build only ruled rows

- **the fork**: at execution, (a) build each row's ruled verdict and halt on blanks; (b) build the proposed verdict where the ruled cell is blank; (c) let the wisher choose per inventory, via one blanket line.
- **taken**: (c). each inventory opens with `blanket ruled: _(blank)_`. a blank row takes the blanket if the wisher set it to `agree unless ruled`; with no blanket, a blank row halts (case 6). case 8 shows the blanket path.
- **why at the time**: the wisher said *"i expect to disagree with some of the choices, so lets plan to review them."* "some" predicts a review by exception. (a) alone would cost ~70 typed cells; (b) alone would settle reserved calls by side effect. the blanket is the wisher's explicit act, so it is a verdict, not a guess.
- **rework**: clean.
- **confidence**: 85%. the wisher may prefer to rule in chat and have the clone transcribe.
- **where**: every inventory · cases 5, 6, 8
- **verdict**: **skepticized (2026-11-23), confident** — (b), by the wisher's later rule: *"a human should only be expected to check the unconfident ones"*. execution builds each proposed verdict where the ruled cell is blank; a row whose proposed call is unconfident is itemized for the wisher, never halted on. the wisher's approval of the vision (2026-11-23) stands behind the proposed calls. 90%

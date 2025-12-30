if your refactor produces a change in behavior that was not explicitly asked for, it should always be questioned and reviewed with the asker

if your refactor produces a change in behavior that was not explicitly asked for && requires the change of tests that covered the old behavior, this is an even bigger red flag, and should especially be questioned and reviewed with the asker

---

for example

"ignore other files, only bootup briefs and skills"

IF
- the concept of "other files" is new since the last commit on main (i.e., its a staged or unstaged change, or committed on the branch but not main)
- the fulfillment of that ask requries you to remove assertions against "bootup readme.md"

THEN
- should you just blindly remove the "bootup readme.md" behavior assertions from the test files to comply?
- OR
- should you just blindly assume that the user only meant the new changes?
- OR
- should you ask the caller to review the two options, since their requset might cause a change to new behavior

?

Ideally, ask the caller explicitly to clarify their request
- did they mean to revert the new behavior but keep the old?
- or
- did they mean to revert the new behavior AND change to old?

If you're unable to ask though, always assume they intended to preserve the old behavior when there is new behavior they could ask about - unless they explicitly mentioned the old behavior with the same terms the test spoke about it with.

---

but never blindly degrade prior behavior without explicit confirmation

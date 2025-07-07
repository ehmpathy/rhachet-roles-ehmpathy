to consider is whether stitches should be the only memory we should mutate

or

whether the context is mutated itself too

---

probably, context can be mutated, but there will exist some StitchSetEvent which was emitted to mutate it (even if not retained in final threads out)

otherwise, would have to "resummarize" each new state of memory; suboptimal

---

artifacts vs memory?

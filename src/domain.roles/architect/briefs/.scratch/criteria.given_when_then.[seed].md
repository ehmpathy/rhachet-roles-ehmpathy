criteria is best written in behavior-driven-development format

e.g.,

given(scene)
  when([t0] nochange)
    then(assert initial condition)
    ...
  when([t1] cause)
    then(effect)
      sothat(benefit) # optional
    ...
  when([t2] cause)
    then(effect)
      sothat(benefit) # optional
    ...


dont forget that given and when can nest inside eachother; but then() goes at the root


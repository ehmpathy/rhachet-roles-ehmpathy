use this brief to help you declare acceptance test criteria for .behavior

in BDD given/when/then format

================================

recall:
- acceptance.criteria should only test BEHAVIOR; never internals
- acceptance.criteria should treat the system as a black box
  - it doesn't care how it gets done and has no visibility into it
  - it only cares that the usecases are satisfied for the given scenes
  - it only engages with the system at the CONTRACT LAYER
    - src/contract/endpoints (a.k.a. src/contract/handlers)
    - src/contract/commands


distinguish the criteria into

BLOCKER = required; will not satisfy requireemnts without it
and
NITPICK = nicetohave, but not a show stoppeer


================================

here's some examples of what i mean


[idea] = nest then's within sothat? when many thens support the same sothat?

  when([t4] bastion IAM instance profile is provisioned via terraform)
    sothat(SSM sessions can be established to bastion)
      then(instance profile includes AmazonSSMManagedInstanceCore policy)
      then(instance profile allows ssm:StartSession action)
    sothat(auto-pause can detect when bastion is idle)
      then(instance profile allows ec2:StopInstances for self-stop)
      then(instance profile allows ec2:DescribeInstances to check instance state)
      then(instance profile allows ssm:DescribeSessions to detect active sessions)
      then(instance profile allows ssm:GetConnectionStatus to verify session state)


i.e.,

usecase(purpose)
  given(scene)
    when(cause)
      sothat(benefit)
        then(effect.1)
        then(effect.2)


---


e.g.,

usecase(eat dinner)
  given(its dinner time)
    when(dinner is served)
      sothat(we can eat with cleanly)
        then(we should have cutlery appropriate to the dish)
        then(we should have plates appropriate to the dish)
        then(we should have napkins to clean with)




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


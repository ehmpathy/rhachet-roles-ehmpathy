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


given(scene)
  when(cause)
    sothat(benefit)
      then(effect.1)
      then(effect.2)


---


e.g.,

given(its dinner time)
  when(dinner is served)
    sothat(we can eat with cleanly)
      then(we should have cutlery appropriate to the dish)
      then(we should have plates appropriate to the dish)
      then(we should have napkins to clean with)


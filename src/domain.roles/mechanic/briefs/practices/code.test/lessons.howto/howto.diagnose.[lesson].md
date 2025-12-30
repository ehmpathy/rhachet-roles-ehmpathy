if you have a failed test

1. make the error super clear via
   1. observable error messages
   2. clear log trails

2. when you detect which subcomponent has unexpected behavior
   1. cover that subscomponent with tests of its own (unit, integration, etc)
   2. if it does not have its own procedure, breakit out into its own procedure (own function + own file + own test suite)

that way
1. its easy to see exactly what failed
2. its easy to prove we fixed it (or verify that the behavior is / isnt expected)
3. we can systematically track down the bug, one subcomponnent at a time

patterns:
  - [resource] -> <mechanism> -> [resource]
  - <mechanism>[resource]
  - <mechanism>[resource]<mechanism>
  - @[actor]<mechanism> -> [resource] -> {drive:<<effect>>[motive]}
  - <create>[<mechanism>].to(<mechanism>[resource])

requirements:
  - all <verb>s must be declared as <mechanism>s
  - all [noun]s must be declared as [resource]s
  - all <mechanism>s should be prefixed with their root operation
    - <get> for reads
    - <set> for dobj mutations
    - <rec> for event emissions
  - use <mechanism>[resource] syntax for brevity, when applicable
  - scope [resources] within [domain]s when needed for specificity
    - [domain][resource]
  - leverage [resources] .attributes when needed
    - [resource].attribute

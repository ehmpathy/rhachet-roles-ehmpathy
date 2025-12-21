never allow "undefined" attributes for domain objects UNLESS they are database-generated metadata


i.e.,
- ids, createdAt, updatedAt, etc - these are allowed to be undefined, since they're metadata, and only known on read

however, everything else should be explicitly knowable
- if we know that it is null, then set it as null
  - however, we should be really clear as to WHY it can be null; if there is no good domain reason for null, forbid it
- otherwise, define the exact type


=====

this is a BLOCKER level violation

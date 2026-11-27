# ref.nd.oracle-dbms-lock

grade: ✅ — the publisher's own docs (oracle corporation), Oracle Database release 19 (not the latest release; the page url pins 19)
cite: Oracle Database PL/SQL Packages and Types Reference, Release 19. "DBMS_LOCK" (Overview; Operational Notes; REQUEST function). docs.oracle.com/en/database/oracle/oracle-database/19/arpls/DBMS_LOCK.html
seen: `.raw/page.oracle-dbms-lock.json.txt` — fetched 2026-11-27 by `.playbooks/fetch-sources.play.ts`

## .quotes

> "The DBMS_LOCK package provides an interface to Oracle Lock Management services. You can request a lock of a specific mode, give it a unique name recognizable in another procedure in the same or another instance, change the lock mode, and release it."

> "These uses include the following: Providing exclusive access to a device, such as a terminal; Providing application-level enforcement of read locks; Detecting when a lock is released and cleanup after the application; Synchronizing applications and enforcing sequential processing" (Overview; the four uses are separate list items on the page)

> "User locks never conflict with Oracle locks because they are identified with the prefix “UL”."

> "User locks are automatically released when a session terminates. The lock identifier is a number in the range of 0 to 1073741823."

> "Oracle strongly recommends that you develop a standard convention for using these locks in order to avoid conflicts among procedures trying to use the same locks. For example, include your company name as part of your lock names."

> "Be certain that any user locks used in distributed transactions are released upon COMMIT, or an undetected deadlock may occur."

> release_on_commit parameter of REQUEST: "Set this parameter to TRUE to release the lock on commit or roll-back. Otherwise, the lock is held until it is explicitly released or until the end of the session."

## .supports

- advisory lock as a mutex: the lock is a name or number the application defines; the server keeps it apart from the locks it takes on data ("never conflict with Oracle locks"), so only code that calls `DBMS_LOCK` on the same name meets it; the docs ask for a name convention to avoid collisions
- session scope by default, transaction scope by an opt-in flag — the same two scopes as postgres (`ref.nd.postgresql` §13.3.5) and sql server (`ref.nd.microsoft-sp-getapplock`)

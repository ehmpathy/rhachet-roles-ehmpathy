# ref.nd.pgbouncer

grade: ✅ — the project's own docs (pgbouncer authors)
cite: PgBouncer. "Features" (SQL feature table for pool modes) · "Config" (`pool_mode`, `server_reset_query`, `server_reset_query_always`). pgbouncer.org/features.html · pgbouncer.org/config.html
seen: `.raw/page.pgbouncer-features.json.txt` · `.raw/page.pgbouncer-config.json.txt` — fetched 2026-11-27 by `.playbooks/fetch-sources.play.ts`

## .quotes

> "Transaction pooling: A server connection is assigned to a client only during a transaction. When PgBouncer notices that the transaction is over, the server will be put back into the pool. This mode breaks a few session-based features of PostgreSQL. You can use it only when the application cooperates by not using features that break. See the table below for incompatible features." (Features)

> "Session pooling: Most polite method. When a client connects, a server connection will be assigned to it for the whole duration it stays connected. When the client disconnects, the server connection will be put back into pool. This mode supports all PostgreSQL features." (Features)

> "Note that “transaction” pooling breaks client expectations of the server by design and can be used only if the application cooperates by not using non-working features." (Features, above the table)

> the feature table, last entry: "Session-level advisory locks — Session pooling: Yes — Transaction pooling: Never" (Features; the other entries marked "Never" under transaction pooling are SET/RESET, LISTEN, WITH HOLD CURSOR, PREPARE / DEALLOCATE, PRESERVE/DELETE ROWS temp tables, and LOAD)

> "When transaction pooling is used, the server_reset_query is not used, because in that mode, clients must not use any session-based features, since each transaction ends up in a different connection and thus gets a different session state." (Config, server_reset_query)

> "This setting is for working around broken setups that run applications that use session features over a transaction-pooled PgBouncer. It changes non-deterministic breakage to deterministic breakage: Clients always lose their state after each transaction." (Config, server_reset_query_always)

not on the page: the table has no entry for transaction-level advisory locks (`pg_advisory_xact_lock`). it lists only the session-level kind as "Never" under transaction pooling. that a transaction-level lock survives transaction pooling follows from its scope (postgres §13.3.5: released at transaction end), and the page does not say it — an inference, not a pgbouncer claim.

## .supports

- advisory lock as a mutex, session scope: pgbouncer marks session-level advisory locks "Never" under transaction pooling. reason, inferred from the quotes above and from `ref.nd.postgresql` §13.3.5 (a session-level lock belongs to the server session): each transaction "ends up in a different connection", so the lock and its unlock may run on different sessions. cure the docs imply: session pooling, or the transaction-level function
- the docs' own phrase for the contract: the application "cooperates by not using non-working features"

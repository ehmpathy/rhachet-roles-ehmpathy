# rule.forbid.analytical-scans-on-live-storage

## .what

never run analytical reads — reports, aggregates, trends over history — against the transactional storage that serves live writes. a scan over history locks the records and burns the cpu that live writes need.

transactional and analytical are two kinds of domain (`define.software-domain-taxonomy`); each gets its own storage.

## .the two storages

| | transactional storage | analytical warehouse |
|---|---|---|
| is | the source of truth | a derived copy of it |
| engine | a transactional database (postgres, dynamodb) | a warehouse (redshift, athena, bigquery) |
| serves | every live read and write, and every write-time check | reports, aggregates, trends over history |
| fed by | the domain's own operations | a one-way export from the transactional storage |
| may lag | never | yes — minutes or hours behind |

the flow runs one way: transactional storage → warehouse. the warehouse never feeds back, and no live path reads it.

a read replica is not the warehouse. it is the transactional storage again — same engine, same schema, a lagged copy. it relieves the primary of read load; it is not the analytical kind.

## .the smell

- a `group by` or `sum` over months of records on the write path
- a dashboard query against the primary
- a nightly report that slows the 6am reservations
- a live path — a screen, a write-time check, a domain operation — that reads the warehouse
- a domain write that lands in the warehouse, or a load from the warehouse back into the transactional storage

```sql
-- 👎 against the primary, while surfers book the dawn session
select instructor_ref, count(*) from lesson_reservation
where created_at > now() - interval '12 months'
group by instructor_ref;
```

```ts
// 👎 a live check against the warehouse — it lags, so a surfer just booked is absent
const lessonsThisMonth = await sdkRedshift.query({ sql: countLessonsBySurferSql, surferUuid });
if (lessonsThisMonth >= 8) return ConstraintError.throw('monthly lesson cap reached', { surferUuid });
```

## .the cure

export one way into an analytical warehouse, and query there. the transactional storage stays the source of truth: it serves every live read, every write, and every write-time check. the warehouse serves only analysis.

## .enforcement

- analytical scan against the live transactional storage = **blocker**
- a live read or write-time check against the warehouse = **blocker**
- a domain write into the warehouse, or a flow from the warehouse back into the transactional storage = **blocker**

## .see also

- `define.software-domain-taxonomy` — transactional vs analytical vs operations research
- `rule.forbid.cqrs` (domain.events) — a lagged read side behind a live screen; the warehouse is not cqrs, since no live path reads it
- `rule.require.read-your-writes` (domain.transactions) — why a live read never goes to a lagged copy

this is an alias to ./forbid.index.ts.md

NEVER do barrel exports

e.g.,
- `src/domain.objects/index.ts`
- `src/domain.operations/organization/index.ts`
- `src/domain.operations/organizationAccount/index.ts`
- `src/access/daos/index.ts`
- `src/contract/sdks/index.ts`

all are banned

they're just new aliases that increase
- codepath variants
- cyclical import chances

totally forbidden

they add zero value


---

the only case that's allowed is

within an index.ts file, to export one object

e.g.,

```ts
export const daoAwsOrganization = {
  getOne,
  getAll,
  set,
  del,
}
```
nice and tight export

but thats it. never just an export forwarder

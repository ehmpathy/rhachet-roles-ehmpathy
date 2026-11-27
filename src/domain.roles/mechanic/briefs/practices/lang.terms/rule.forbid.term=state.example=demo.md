# rule.forbid.term=state.example=demo

a 👎/👍 demo for `rule.forbid.term=state`.

**👎 bad**
```ts
const [state, setState] = useState(null);
if (order.state === 'shipped') ship({ order });
// the docs state that a retry is safe
```

**👍 good**
```ts
const [swell, setSwell] = useSwellPersistedInMemory();
if (order.status === 'shipped') ship({ order });
// the docs declare that a retry is safe
```

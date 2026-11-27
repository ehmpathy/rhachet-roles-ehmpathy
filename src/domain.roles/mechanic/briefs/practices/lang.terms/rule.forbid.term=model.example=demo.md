# rule.forbid.term=model.example=demo

a 👎/👍 demo for `rule.forbid.term=model`.

**👎 bad**
```
// the model returns the invoice model
const invoiceModel = await brain.ask({ prompt });
```

**👍 good**
```
// the brain returns an invoice
const invoice = await brain.ask({ prompt });
```

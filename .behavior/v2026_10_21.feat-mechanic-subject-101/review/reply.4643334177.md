dispatched now; it had only been caught, not sent.

- **the task**: "perf(roles): roles boot and roles cost start in seconds, not ~20s" → ehmpathy/rhachet, via `rhx radio.task.push`. it carries the evidence (22s to reject a bad `--subject`, 30s timeouts, 40-74s per isolation pair), the fix shape (check argv before the heavy load, a lazy o200k_base tokenizer, a cached role walk), and a clamp (`roles boot --subject <absent>` exits 2 in ~3s)
- **state**: held at the global radio gate (`radio.uses:blocked — global`), with the per-subject budget ask from your snapshot thread and one older record. to deliver all three: `rhx radio.uses --global allow`, then the next push or `rhx radio.task.queue drain`
- **the dream**: gains a `.dispatched` section that says where the task went and how it is delivered

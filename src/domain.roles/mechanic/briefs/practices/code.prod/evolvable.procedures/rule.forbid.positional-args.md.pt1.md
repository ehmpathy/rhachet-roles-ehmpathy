positional args are
- hard to read
- easy to break

never use positional args if we can avoid them


even in bash!


---

e.g., which one's easier to understand?


```sh
  # final attempt with fail_on_error=true (exits on hard failures, warns on timeout)
  _try_start_port_forwarding "$instance_id" "$rds_endpoint" 60 true
```


vs

```sh

  # final attempt with fail_on_error=true (exits on hard failures, warns on timeout)
  _try_start_port_forwarding \
    instance_id="$instance_id" \
    rds_endpoint="$rds_endpoint" \
    timeout=60 \
    fail_on_error=true
```


---



  - Self-documenting: You can see what each parameter is at the call site
  - Order-independent: Arguments can be passed in any order
  - Easier to maintain: Adding new optional parameters won't break existing calls
  - Validation: Each function validates required parameters
  - Usage examples: Included in function headers

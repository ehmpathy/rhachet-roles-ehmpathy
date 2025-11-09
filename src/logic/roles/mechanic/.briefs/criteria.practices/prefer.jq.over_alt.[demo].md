# given

you are in a .shell env

# what

prefer `jq` over escape to other languages, like python

# demo

### bad practice

```sh
  local instance_id
  instance_id=$(echo "$instance_json" | python3 -c "
import sys, json
data = json.load(sys.stdin)
if data and data != 'None':
  print(data.get('InstanceId', ''))
" 2>/dev/null)
```


### best practice

```sh
  local instance_id
  instance_id=$(echo "$instance_json" | jq -r '.InstanceId // empty' 2>/dev/null)
```

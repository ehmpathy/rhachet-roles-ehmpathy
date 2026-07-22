
can failfast via MalfunctionError && ConstraintError in shell too


```sh
          # find the daemon info file (port-specific)
          INFO_FILES=($(ls /tmp/vpc-tunnel-*-info.json 2>/dev/null))
          if [ ${#INFO_FILES[@]} -eq 0 ]; then
            echo "✗ MalfunctionError: tunnel info file not found"
            exit 1
          elif [ ${#INFO_FILES[@]} -gt 1 ]; then
            echo "✗ MalfunctionError: multiple tunnel info files found: ${INFO_FILES[@]}"
            exit 1
          fi
          INFO_FILE="${INFO_FILES[0]}"
          echo "• using tunnel info: $INFO_FILE"
```

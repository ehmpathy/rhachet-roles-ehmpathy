# self-review: has-pruned-backcompat (r2)

## deeper review

re-read the diff with fresh eyes focused on backcompat shims.

### potential concern: IS_DIR_REMOVE path unchanged structure

the directory removal path maintains its extant structure:
- validate recursive flag
- compute TARGET_ABS
- validate within repo
- prevent repo root delete
- rm -rf
- output

we added trash logic (cp before rm) but preserved all extant guards. this is not backcompat - it's additive safety. no "old behavior" fallback needed.

### potential concern: file loop structure unchanged

the file removal loop maintains its extant structure:
- for each FILE
- compute TARGET_ABS
- validate within repo
- rm
- output

again, we added trash logic but preserved all extant guards. no shim.

### why this holds

the changes are purely additive:
1. new internal function (findsert_trash_dir)
2. new calls (cp before rm)
3. new output (coconut hint)

no code was removed or replaced with a compatibility shim. the extant API contract (arguments, exit codes, error messages) remains identical.

## conclusion

no backcompat shims detected in second pass. changes are additive.

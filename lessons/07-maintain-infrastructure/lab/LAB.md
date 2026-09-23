# Lab 07 — Import, inspect, debug

```bash
cd lessons/07-maintain-infrastructure/lab
terraform init
```

## Exercise 1 — `import` block + generated config
1. Uncomment the `import { ... }` block in `main.tf`.
2. Generate the configuration:
   ```bash
   terraform plan -generate-config-out=generated.tf
   cat generated.tf
   ```
3. Review `generated.tf` (it's a starting point: you may need to remove conflicting attributes).
4. `terraform apply` → plan shows `1 to import`. Check: `terraform state show random_string.legacy_token`
   → `result = "LegacyToken42"`. Terraform adopted the existing value instead of generating a new one.
5. Run `terraform plan` → `No changes`. You can now delete the `import` block.

## Exercise 2 — CLI `terraform import`
1. Apply once so `random_id.session` exists, and note its ID (the `b64_url` attribute):
   ```bash
   terraform apply -auto-approve
   terraform state show random_id.session | grep b64_url
   ```
2. Remove it from state (pretend it was created by hand):
   ```bash
   terraform state rm random_id.session
   terraform plan          # Terraform wants to create a NEW one
   ```
3. Import it back using the `b64_url` value you noted:
   ```bash
   terraform import random_id.session <B64_URL_VALUE>
   terraform state show random_id.session
   terraform plan          # No changes: config, state and "reality" agree again
   ```
   Note: no plan preview during CLI import, and the config had to exist first.
4. Try importing a *different* ID (e.g. `p-9hUg`) after another `state rm`. The plan now replaces
   `local_file.report`, because the imported value differs and the file content depends on it.

## Exercise 3 — Inspect with the CLI
```bash
terraform state list
terraform show
terraform show -json | head -c 600; echo
terraform output -raw session_hex; echo
terraform console <<< 'random_id.session.b64_std'
terraform providers
terraform version
```

## Exercise 4 — Verbose logging
```bash
TF_LOG_PATH=debug.log terraform plan        # no file! TF_LOG not set
ls debug.log 2>/dev/null || echo "no log file"
TF_LOG=DEBUG TF_LOG_PATH=debug.log terraform plan
wc -l debug.log
TF_LOG=TRACE TF_LOG_PATH=trace.log terraform plan
wc -l trace.log                               # TRACE is much more verbose
TF_LOG_PROVIDER=TRACE terraform plan 2>&1 | head -20   # provider-only logs to stderr
rm -f debug.log trace.log
```

## Exercise 5 — Tests
```bash
terraform test
```

## Clean up
```bash
terraform destroy -auto-approve
rm -f generated.tf
```

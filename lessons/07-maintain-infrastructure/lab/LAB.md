# Lab 07 — Import, inspect, debug

> **Checkpoints:** answer the `question` blocks and run the `check` blocks as you go. On the training website
> they are interactive, and the lab counts as done when every checkpoint passes.

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

```check
id: imported
title: Import random_string.legacy_token
run: terraform state show -no-color random_string.legacy_token | grep -q 'result.*"LegacyToken42"'
hint: Uncomment the `import` block, run `terraform plan -generate-config-out=generated.tf`, then `terraform apply`.
```

```question
Q: What does `terraform plan -generate-config-out=generated.tf` do?
- A. Imports the resource into state immediately
- B. Writes HCL for the resources in `import` blocks that have no configuration yet
- C. Exports the whole state as HCL
- D. Formats the configuration into one file
answer: B
explain: It only generates configuration. The import itself happens at `terraform apply`, after you review the plan.
```

## Exercise 2 — CLI `terraform import`
1. Apply once so `random_id.session` exists, and note its ID (the `b64_url` attribute):
   ```bash
   terraform apply -auto-approve
   terraform state show random_id.session | grep b64_url
   ```
2. Remove it from state (pretend it was created by hand):
   ```bash
   terraform state rm random_id.session
   terraform plan          # what does Terraform want to do now?
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

```question
Q: After `terraform state rm random_id.session`, what does `terraform plan` want to do?
- A. Nothing: the resource still exists
- B. Create a new `random_id.session`, because it's in the configuration but no longer in state
- C. Destroy `random_id.session`
- D. Import it automatically
answer: B
explain: `state rm` makes Terraform forget the object. With the block still in configuration, Terraform plans to create it.
```

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
TF_LOG_PATH=debug.log terraform plan        # is a log file written?
ls debug.log 2>/dev/null || echo "no log file"
TF_LOG=DEBUG TF_LOG_PATH=debug.log terraform plan
wc -l debug.log
TF_LOG=TRACE TF_LOG_PATH=trace.log terraform plan
wc -l trace.log                               # compare with debug.log
TF_LOG_PROVIDER=TRACE terraform plan 2>&1 | head -20   # provider-only logs to stderr
rm -f debug.log trace.log
```

```question
Q: Why does `TF_LOG_PATH=debug.log terraform plan` not create a log file?
- A. The path must be absolute
- B. `TF_LOG` isn't set, and `TF_LOG_PATH` has no effect without a log level
- C. Logs are only written on errors
- D. Logging needs the `-verbose` flag
answer: B
explain: Set a level such as `TF_LOG=DEBUG` too. `TRACE` is the most verbose level, so `trace.log` is much longer than `debug.log`.
```

## Exercise 5 — Tests
```bash
terraform test
```

```check
id: tests
title: Run the test suite
run: terraform test -no-color >/dev/null
hint: Run `terraform test`. Both run blocks must pass.
```

## Clean up
```bash
terraform destroy -auto-approve
rm -f generated.tf
```

```check
id: destroyed
title: Destroy everything and remove generated.tf
run: grep -q '"resources": \[\]' terraform.tfstate && test ! -f generated.tf
hint: Run `terraform destroy -auto-approve`, then `rm -f generated.tf`.
```

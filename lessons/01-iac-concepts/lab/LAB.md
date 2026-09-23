# Lab 01 — Your first declarative configuration

**Goal:** feel the difference between declarative and imperative, and see idempotency.

## Steps

```bash
cd lessons/01-iac-concepts/lab
terraform init
terraform apply        # type "yes"
cat output/hello.txt
```

1. Run `terraform apply` **again**. Notice: `No changes. Your infrastructure matches the configuration.`
   That's **idempotency** — declaring the same desired state twice does nothing the second time.
2. Change `var.greeting` default in `main.tf` to something else and run `terraform plan`.
   Notice `-/+ must be replaced` — the `local_file` resource can't be modified in place, so Terraform
   replaces it (immutable pattern).
3. Delete `output/hello.txt` manually, then `terraform plan`. Terraform detects the file is gone
   (drift) and plans to recreate it.
4. Compare with `imperative.sh`: run it twice. It blindly repeats its steps; it has no concept of
   current vs. desired state.
5. Clean up:
   ```bash
   terraform destroy
   ```

## What you learned

- Declarative config + state = idempotent, drift-aware changes.
- Some changes force replacement.

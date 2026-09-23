# Lab 06 — Backends, locking, state commands, drift, refactoring

```bash
cd lessons/06-state-management/lab
terraform init
terraform apply -auto-approve
```

## Exercise 1 — Local backend & migration
1. `ls` → `terraform.tfstate` is here (default local backend).
2. Uncomment the `backend "local"` block in `main.tf`, then `terraform plan` → error: backend changed.
3. `terraform init -migrate-state` → answer `yes`. State now lives in `state/terraform.tfstate`.
4. Re-comment the block and `terraform init -migrate-state` to move it back.

## Exercise 2 — Inspect state
```bash
terraform state list
terraform state show random_pet.app
terraform show
terraform state pull | head -20       # note serial and lineage
terraform output -json
```

## Exercise 3 — Locking
In terminal 1: `terraform apply` (**don't** answer the prompt; leave it waiting).
In terminal 2: `terraform plan` → `Error acquiring the state lock`. Note the lock ID.
Try `terraform plan -lock-timeout=10s`. Then answer `no` in terminal 1.
> `terraform force-unlock <ID>` is only for **stale** locks left by crashed processes.

## Exercise 4 — Drift & refresh-only
```bash
echo "manually edited" > output/app.conf       # simulate an out-of-band change
terraform plan -refresh-only                    # shows what changed in reality
terraform plan                                  # plans to restore the file to config
rm output/legacy.txt                            # simulate deletion outside Terraform
terraform plan                                  # plans to re-create it
terraform apply -auto-approve                   # back to desired state
```

## Exercise 5 — Force replacement
```bash
terraform plan -replace=random_pet.app
terraform apply -replace=random_pet.app -auto-approve
```

## Exercise 6 — Refactor with `moved`
Rename `resource "random_pet" "app"` to `resource "random_pet" "application"` (also fix the references).
`terraform plan` → destroy + create. Now add:
```hcl
moved {
  from = random_pet.app
  to   = random_pet.application
}
```
`terraform plan` → `has moved to`, no changes. Apply. (Equivalent CLI: `terraform state mv`.)

## Exercise 7 — Stop managing with `removed`
Delete the `local_file.legacy` resource block and add:
```hcl
removed {
  from = local_file.legacy
  lifecycle {
    destroy = false
  }
}
```
`terraform apply` → it's removed from state but `output/legacy.txt` still exists.
(Equivalent CLI: `terraform state rm local_file.legacy`.)

## Exercise 8 — CLI workspaces
```bash
terraform workspace list
terraform workspace new staging
terraform apply -auto-approve         # a brand-new state: everything is created again
cat output/app.conf                   # workspace=staging
ls terraform.tfstate.d/
terraform workspace select default
terraform workspace delete -force staging   # -force because its state isn't empty
```
(Note both workspaces wrote to the same file path — a hint for why you'd use
`terraform.workspace` in names.)

## Clean up
```bash
terraform destroy -auto-approve
```

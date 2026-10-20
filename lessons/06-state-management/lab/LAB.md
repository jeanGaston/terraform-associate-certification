# Lab 06 — Backends, locking, state commands, drift, refactoring

> **Checkpoints:** answer the `question` blocks and run the `check` blocks as you go. On the training website
> they are interactive, and the lab counts as done when every checkpoint passes.

```bash
cd lessons/06-state-management/lab
terraform init
terraform apply -auto-approve
```

```check
id: applied
title: Apply the configuration
run: terraform state list | grep -qx 'random_pet.app'
hint: Run `terraform init`, then `terraform apply -auto-approve`.
```

## Exercise 1 — Local backend & migration
1. `ls` → `terraform.tfstate` is here (default local backend).
2. Uncomment the `backend "local"` block in `main.tf`, then `terraform plan`. What happens?
3. `terraform init -migrate-state` → answer `yes`. State now lives in `state/terraform.tfstate`.
4. Re-comment the block and `terraform init -migrate-state` to move it back.

```question
Q: You uncomment the `backend "local"` block and run `terraform plan` without `init`. What happens?
- A. The plan runs against the new backend
- B. `Error: Backend initialization required, please run "terraform init"`
- C. The state is migrated automatically
- D. The plan runs against the old backend with a warning
answer: B
explain: Any backend change must go through `terraform init`, with `-migrate-state` to copy the state or `-reconfigure` to start fresh.
```

```check
id: migrated
title: Migrate the state there and back
run: test -s state/terraform.tfstate && ! grep -Eq '^[[:space:]]*backend "local"' main.tf && terraform state list | grep -qx 'random_pet.app'
hint: Do steps 3 and 4: migrate to `state/terraform.tfstate`, re-comment the block, then migrate back.
```

## Exercise 2 — Inspect state
```bash
terraform state list
terraform state show random_pet.app
terraform show
terraform state pull | head -20       # note serial and lineage
terraform output -json
```

```question
Q: Which command prints the raw JSON of the current state, wherever the backend stores it?
- A. `terraform show -json`
- B. `terraform state pull`
- C. `terraform state list`
- D. `terraform output -json`
answer: B
explain: `state pull` fetches the state from the configured backend. `show -json` prints a processed representation, not the raw state file.
```

## Exercise 3 — Locking
In terminal 1: `terraform apply` (**don't** answer the prompt; leave it waiting).
In terminal 2: `terraform plan`. Read the error and note the lock ID.
Try `terraform plan -lock-timeout=10s`. Then answer `no` in terminal 1.
> `terraform force-unlock <ID>` is only for **stale** locks left by crashed processes.

```question
Q: What happens when you run `terraform plan` in terminal 2 while terminal 1 waits at the apply prompt?
- A. Both runs share the state safely
- B. `Error acquiring the state lock`, because terminal 1 holds the lock
- C. Terminal 1's apply is cancelled
- D. Terminal 2 waits forever by default
answer: B
explain: Locking stops two operations writing the same state. `-lock-timeout=10s` makes the second run retry for 10 seconds before failing.
```

## Exercise 4 — Drift & refresh-only
```bash
echo "manually edited" > output/app.conf       # simulate an out-of-band change
terraform plan -refresh-only                    # shows what changed in reality
terraform plan                                  # plans to restore the file to config
rm output/legacy.txt                            # simulate deletion outside Terraform
terraform plan                                  # plans to re-create it
terraform apply -auto-approve                   # back to desired state
```

```question
Q: After you edit `output/app.conf` by hand, what does `terraform plan -refresh-only` report for `local_file.config`?
- A. `No changes`
- B. `local_file.config has been deleted`
- C. `local_file.config will be updated in-place`
- D. An error about a corrupted file
answer: B
explain: The `local_file` provider treats a file whose content no longer matches as gone. A refresh-only plan reports drift without proposing changes to infrastructure.
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

```check
id: moved
title: Rename random_pet.app with a moved block
run: terraform state list | grep -qx 'random_pet.application' && ! terraform state list | grep -qx 'random_pet.app'
hint: Rename the resource, fix the references, add the `moved` block, then run `terraform apply`.
```

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

```check
id: removed
title: Forget local_file.legacy without deleting it
run: ! terraform state list | grep -qx 'local_file.legacy' && test -f output/legacy.txt && grep -q 'removed {' main.tf
hint: Replace the `local_file.legacy` block with the `removed` block above, then run `terraform apply`.
```

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

```question
Q: Where is the state of the `staging` workspace stored with the local backend?
- A. In `terraform.tfstate`, in a separate section
- B. In `terraform.tfstate.d/staging/terraform.tfstate`
- C. In `.terraform/staging.tfstate`
- D. In HCP Terraform
answer: B
explain: Each non-default CLI workspace gets its own state file under `terraform.tfstate.d/`. A CLI workspace is only a separate state.
```

## Clean up
```bash
terraform destroy -auto-approve
```

```check
id: destroyed
title: Destroy everything in the default workspace
run: test "$(terraform workspace show)" = default && grep -q '"resources": \[\]' terraform.tfstate
hint: Run `terraform workspace select default`, then `terraform destroy -auto-approve`.
```

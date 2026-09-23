# Lab 02 — Providers, versions, the lock file, and aliases

## Part A — Providers & the lock file

```bash
cd lessons/02-terraform-fundamentals/lab
terraform init
ls -la .terraform/providers/registry.terraform.io/hashicorp/
cat .terraform.lock.hcl
terraform version
terraform providers          # shows the provider requirement tree
```

Questions:
1. Which exact versions of `random` and `local` were selected? Where do you see the hashes?
2. Change the `random` constraint in `main.tf` to `"~> 3.5.0"` and run `terraform init`.
   What error do you get, and why? (The lock file pins a version outside the new constraint.)
3. Now run `terraform init -upgrade`. What changed in the lock file?
4. Restore the original constraint and run `terraform init -upgrade` again.

## Part B — Multiple provider configurations with `alias`

Open `aliases.tf`. It declares a default and an aliased configuration of the `random` provider.
`random` takes no arguments, so this is **syntax practice**. The mechanics are the same as the classic
multi-region `aws` example shown in the comments.

```bash
terraform apply
terraform output
```

Look at `terraform state list` — note `random_pet.primary` and `random_pet.secondary`, the latter created
through the aliased provider configuration `random.secondary`.

## Part C — Inspect state

```bash
cat terraform.tfstate | head -40
terraform show
```

Find: `"version"`, `"terraform_version"`, `"serial"`, `"lineage"`, and each resource's `"provider"` string.
Then run `terraform apply` with a change and check that `serial` increments and `terraform.tfstate.backup` appears.

## Clean up

```bash
terraform destroy
```

# Lab 02 — Providers, versions, the lock file, and aliases

> **Checkpoints:** answer the `question` blocks and run the `check` blocks as you go. On the training website
> they are interactive, and the lab counts as done when every checkpoint passes.

## Part A — Providers & the lock file

```bash
cd lessons/02-terraform-fundamentals/lab
terraform init
ls -la .terraform/providers/registry.terraform.io/hashicorp/
cat .terraform.lock.hcl
terraform version
terraform providers          # shows the provider requirement tree
```

```check
id: init
title: Initialize the working directory
run: test -f .terraform.lock.hcl && test -d .terraform/providers/registry.terraform.io/hashicorp/random
hint: Run `terraform init`.
```

1. Which exact versions of `random` and `local` were selected? Where do you see the hashes?

```question
Q: Where are the selected provider versions and their checksums recorded?
- A. In `terraform.tfstate`
- B. In `.terraform.lock.hcl` (the `version` and `hashes` of each provider block)
- C. In `~/.terraformrc`
- D. Only in the output of `terraform providers`
answer: B
explain: The dependency lock file pins the exact version and its `h1:`/`zh:` hashes so every machine installs the same build.
```

2. Change the `random` constraint in `main.tf` to `"~> 3.5.0"` and run `terraform init`.
   What error do you get, and why?

```question
Q: With the lock file already in place, you change the constraint to `"~> 3.5.0"` and run `terraform init`. What happens?
- A. Terraform silently downgrades `random` to 3.5.x
- B. `init` fails: the locked version doesn't satisfy the new constraint, so you must run `init -upgrade`
- C. `init` succeeds and ignores the new constraint
- D. Terraform deletes the lock file and starts over
answer: B
explain: The locked version (3.6 or newer) is outside `>= 3.5.0, < 3.6.0`. Terraform never changes a locked version unless you pass `-upgrade`.
```

3. Now run `terraform init -upgrade`. What changed in the lock file?

```question
Q: After `terraform init -upgrade`, what does the `random` block in `.terraform.lock.hcl` show?
- A. Nothing changed
- B. `version = "3.5.x"` with `constraints = "~> 3.5.0"` and new hashes
- C. Two versions side by side
- D. The block was removed
answer: B
explain: `-upgrade` re-selects the newest version allowed by the constraint and rewrites that provider's entry in the lock file.
```

4. Restore the original constraint and run `terraform init -upgrade` again.

```check
id: constraint-restored
title: Restore the original constraint
run: grep -A2 'hashicorp/random"' .terraform.lock.hcl | grep -q 'constraints = "~> 3.6"'
hint: Set the `random` version back to `"~> 3.6"` in `main.tf`, then run `terraform init -upgrade`.
```

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

```check
id: aliases-applied
title: Apply both provider configurations
run: terraform state list | grep -qx 'random_pet.primary' && terraform state list | grep -qx 'random_pet.secondary'
hint: Run `terraform apply` and answer `yes`.
```

```question
Q: Which provider configuration created `random_pet.secondary`?
- A. The default `random` configuration
- B. The aliased configuration `random.secondary`, selected with `provider = random.secondary`
- C. The `local` provider
- D. A child module
answer: B
explain: A resource uses the default configuration unless its `provider` meta-argument names an alias as `<PROVIDER>.<ALIAS>`.
```

## Part C — Inspect state

```bash
cat terraform.tfstate | head -40
terraform show
```

Find: `"version"`, `"terraform_version"`, `"serial"`, `"lineage"`, and each resource's `"provider"` string.
Then run `terraform apply` with a change and check that `serial` increments and `terraform.tfstate.backup` appears.

```check
id: state-backup
title: Apply a change and get a state backup
run: test -f terraform.tfstate.backup
hint: Change something (for example the `length` of `random_pet.secondary`), then run `terraform apply`.
```

```question
Q: Which field of `terraform.tfstate` stays the same for the whole life of this state?
- A. `serial`
- B. `lineage`
- C. `terraform_version`
- D. `resources`
answer: B
explain: `lineage` is a unique ID set when the state is created. `serial` increments on every write.
```

## Clean up

```bash
terraform destroy
```

```check
id: destroyed
title: Destroy everything
run: grep -q '"resources": \[\]' terraform.tfstate
hint: Run `terraform destroy` and answer `yes`.
```

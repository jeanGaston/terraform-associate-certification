# Lab 04 — Variables, types, expressions, meta-arguments, conditions, sensitive data

> **Checkpoints:** answer the `question` blocks and run the `check` blocks as you go. On the training website
> they are interactive, and the lab counts as done when every checkpoint passes.

```bash
cd lessons/04-terraform-configuration/lab
terraform init
terraform apply
```

Explore the `output/` directory and `terraform state list`.

```check
id: applied
title: Apply the configuration
run: terraform state list | grep -qxF 'local_file.server["web"]' && terraform state list | grep -qx 'data.local_file.web_conf'
hint: Run `terraform init`, then `terraform apply` and answer `yes`.
```

## Exercise 1 — Resource vs data source
- Which addresses in `terraform state list` start with `data.`? Why is it in state if it's not managed?

```question
Q: Which address in `terraform state list` is a data source?
- A. `terraform_data.inventory`
- B. `data.local_file.web_conf`
- C. `random_id.suffix`
- D. `local_sensitive_file.db_credentials`
answer: B
explain: Data sources are prefixed with `data.`. They are cached in state, but Terraform never creates or destroys what they read. `terraform_data` is a managed resource despite its name.
```

## Exercise 2 — Variable precedence
```bash
terraform plan -var 'environment=prod'                       # CLI flag
TF_VAR_environment=stage terraform plan                       # env var
cp example.tfvars terraform.tfvars && terraform plan          # auto-loaded tfvars
TF_VAR_environment=dev terraform plan -var 'environment=prod' # who wins?
rm terraform.tfvars
```
Try an invalid value: `terraform plan -var 'environment=qa'`.

```question
Q: With `TF_VAR_environment=dev` and `-var 'environment=prod'` together, which value is used?
- A. `dev`, because environment variables are read first
- B. `prod`, because `-var` on the command line has the highest precedence
- C. The `default` from `variables.tf`
- D. Terraform errors: a variable can only be set once
answer: B
explain: Precedence, lowest to highest: default, `TF_VAR_`, `terraform.tfvars`, `*.auto.tfvars`, then `-var`/`-var-file`.
```

```question
Q: What happens with `terraform plan -var 'environment=qa'`?
- A. The plan uses `qa`
- B. An `Invalid value for variable` error from the `validation` block
- C. A warning, then the plan uses `dev`
- D. Terraform prompts for another value
answer: B
explain: The variable's `validation` block only allows dev, stage or prod, and a failed validation stops the run.
```

## Exercise 3 — count vs for_each
1. Apply with `-var 'admins=["alice","bob","carol"]'`.
2. Now remove **bob** (the middle one): `-var 'admins=["alice","carol"]'` and **plan**. Read the plan carefully.
3. Remove a server from `var.servers` instead (edit the default). Only that one key is destroyed — stable addresses.

```check
id: three-admins
title: Apply with three admins
run: terraform state list | grep -qxF 'local_file.admin[2]'
hint: Run `terraform apply -var 'admins=["alice","bob","carol"]'` and answer `yes`.
```

```question
Q: You plan with `admins=["alice","carol"]` after applying alice, bob and carol. What does the plan show?
- A. Only `local_file.admin[1]` (bob) is destroyed
- B. `local_file.admin[1]` must be replaced (it becomes carol) and `local_file.admin[2]` is destroyed
- C. No changes
- D. All three admin files are replaced
answer: B
explain: `count` addresses are positional: removing an element shifts every later index. `for_each` keys (like `var.servers`) avoid this.
```

## Exercise 4 — Expressions in the console
```bash
terraform console
> local.common_tags
> { for k, v in var.servers : k => v.size }
> [for n in var.admins : upper(n) if n != "bob"]
> local_file.admin[*].filename
> cidrsubnet("10.0.0.0/16", 8, 3)
> lookup(var.tags, "owner", "unknown")
> try(var.servers["db"].size, "no db")
> var.db_password           # (sensitive)
```

```question
Q: What does `cidrsubnet("10.0.0.0/16", 8, 3)` return?
- A. `"10.0.3.0/24"`
- B. `"10.3.0.0/16"`
- C. `"10.0.0.3/32"`
- D. `"10.0.8.0/24"`
answer: A
explain: It adds 8 bits to the /16 prefix (giving a /24) and picks subnet number 3.
```

```question
Q: What does the console print for `var.db_password`?
- A. The password in clear text
- B. `(sensitive value)`
- C. An error: sensitive values can't be referenced
- D. An empty string
answer: B
explain: Sensitive values are redacted in console and CLI output. They are still stored in clear text in the state file (see exercise 6).
```

## Exercise 5 — Custom conditions
1. Set a server size to `"huge"` in `example.tfvars` and plan with `-var-file=example.tfvars`. What stops the plan?
2. The `check "password_strength"` block reports on every plan. Set
   `TF_VAR_db_password=a-very-long-and-strong-secret` and plan again.

```question
Q: How does the `check "password_strength"` block behave when the password is too short?
- A. It stops the plan with an error
- B. It shows a warning, and the run continues
- C. It silently replaces the password
- D. It only runs during `terraform test`
answer: B
explain: `check` block assertions are warnings. The `precondition` on `local_file.server` (size must be small, medium or large) is what stops the plan for `"huge"`.
```

## Exercise 6 — Sensitive data
```bash
terraform output                 # db_password = <sensitive>
terraform output -raw db_password
grep -A2 db_password terraform.tfstate   # what do you see?
```

```question
Q: What does `grep -A2 db_password terraform.tfstate` show?
- A. `<sensitive>`
- B. The password in plain text
- C. A hash of the password
- D. Nothing: sensitive values are never written to state
answer: B
explain: `sensitive` only redacts CLI output. Protect your state (encrypted remote backend, restricted access), or use ephemeral values and write-only arguments.
```

## Exercise 7 — lifecycle
- Change `project` to `acme2` and plan. `random_id.suffix` is replaced (keepers changed), so every server file
  changes. Look at the symbol used for the server files.
- Add `prevent_destroy = true` to `random_id.suffix`, then run `terraform plan -destroy` → error. Remove it.

```question
Q: With `create_before_destroy = true`, which symbol does the plan show for the replaced server files?
- A. `-/+` (destroy, then create)
- B. `+/-` (create the replacement, then destroy)
- C. `~` (update in place)
- D. `<=` (read)
answer: B
explain: `+/-` means create replacement and then destroy, which avoids a gap. The default replacement order is `-/+`.
```

## Exercise 8 — Dependencies
```bash
terraform graph | grep -E 'inventory|admin'
```
`terraform_data.inventory` depends on `local_file.admin` explicitly (`depends_on`) and on `random_id.suffix` implicitly.

## Clean up
```bash
terraform destroy
```

```check
id: destroyed
title: Destroy everything
run: grep -q '"resources": \[\]' terraform.tfstate
hint: Run `terraform destroy` and answer `yes`. Remove `prevent_destroy` first if you left it in.
```

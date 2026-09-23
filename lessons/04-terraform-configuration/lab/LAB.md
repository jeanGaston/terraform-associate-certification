# Lab 04 — Variables, types, expressions, meta-arguments, conditions, sensitive data

```bash
cd lessons/04-terraform-configuration/lab
terraform init
terraform apply
```

Explore the `output/` directory and `terraform state list`.

## Exercise 1 — Resource vs data source
- Which addresses in `terraform state list` start with `data.`? Why is it in state if it's not managed?
  (Data sources are cached in state, but Terraform never creates/destroys the underlying object.)

## Exercise 2 — Variable precedence
```bash
terraform plan -var 'environment=prod'                       # CLI flag
TF_VAR_environment=stage terraform plan                       # env var
cp example.tfvars terraform.tfvars && terraform plan          # auto-loaded tfvars
TF_VAR_environment=dev terraform plan -var 'environment=prod' # who wins? (CLI)
rm terraform.tfvars
```
Try an invalid value: `terraform plan -var 'environment=qa'` → validation error.

## Exercise 3 — count vs for_each
1. Apply with `-var 'admins=["alice","bob","carol"]'`.
2. Now remove **bob** (the middle one): `-var 'admins=["alice","carol"]'` and **plan**.
   Notice that `local_file.admin[1]` is **replaced** (index shift) and `[2]` destroyed.
3. Remove a server from `var.servers` instead (edit the default). Only that one key is destroyed — stable addresses.

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

## Exercise 5 — Custom conditions
1. Set a server size to `"huge"` in `example.tfvars` and plan with `-var-file=example.tfvars` → **precondition** fails.
2. The `check "password_strength"` block shows a **warning** on every plan but never blocks. Set
   `TF_VAR_db_password=a-very-long-and-strong-secret` and plan again — warning gone.

## Exercise 6 — Sensitive data
```bash
terraform output                 # db_password = <sensitive>
terraform output -raw db_password
grep -A2 db_password terraform.tfstate   # plain text in state!
```
Takeaway: `sensitive` only redacts CLI output — protect your state.

## Exercise 7 — lifecycle
- Change `project` to `acme2` and plan. `random_id.suffix` is replaced (keepers changed), so every server file
  changes. Because of `create_before_destroy`, the plan shows `+/-` for the server files.
- Add `prevent_destroy = true` to `random_id.suffix`, then run `terraform plan -destroy` → error. Remove it.

## Exercise 8 — Dependencies
```bash
terraform graph | grep -E 'inventory|admin'
```
`terraform_data.inventory` depends on `local_file.admin` explicitly (`depends_on`) and on `random_id.suffix` implicitly.

## Clean up
```bash
terraform destroy
```

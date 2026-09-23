# Practice Exam 1

**40 questions · 45 minutes · pass mark: 70% (aim for 85%+)**
Answers and explanations are at the bottom — don't scroll until you're done.

---

**1.** Which statement best describes Terraform's approach to infrastructure?
- A. Imperative — you list the exact API calls to make
- B. Declarative — you describe the desired end state
- C. Procedural — you write scripts executed in order
- D. Agent-based — an agent on each server pulls configuration

**2.** Which are benefits of Infrastructure as Code? *(Select THREE)*
- A. Changes can be reviewed through version control
- B. Environments can be reproduced consistently
- C. Cloud provider bills are eliminated
- D. Changes can be previewed before being applied
- E. No need to understand the underlying platform

**3.** True or False: Terraform configuration written for AWS can be deployed to GCP by changing only the provider block.
- A. True
- B. False

**4.** Which file should be committed to version control so that all team members use the same provider versions?
- A. `terraform.tfstate`
- B. `.terraform/`
- C. `.terraform.lock.hcl`
- D. `terraform.tfvars`

**5.** A provider version constraint is `~> 4.2.0`. Which version is allowed?
- A. 4.3.0
- B. 4.2.9
- C. 5.0.0
- D. 4.1.9

**6.** Where does `terraform init` download providers to by default?
- A. `~/.terraform.d/plugins`
- B. `/usr/local/bin`
- C. The `.terraform` directory in the working directory
- D. The state file

**7.** You need two AWS provider configurations for two regions. Which argument distinguishes the second one?
- A. `name`
- B. `alias`
- C. `region_id`
- D. `id`

**8.** Which command should you run first in a newly cloned Terraform repository?
- A. `terraform plan`
- B. `terraform validate`
- C. `terraform init`
- D. `terraform apply`

**9.** What does `terraform validate` check? *(Select TWO)*
- A. Syntax errors
- B. That referenced variables are declared
- C. That credentials are valid
- D. That the AMI ID exists
- E. That the state matches the real infrastructure

**10.** Which command would you use in CI to fail a pipeline when code is not formatted?
- A. `terraform fmt -diff`
- B. `terraform fmt -check`
- C. `terraform validate -fmt`
- D. `terraform lint`

**11.** In plan output, what does `-/+` indicate?
- A. The resource will be updated in place
- B. The resource will be destroyed and re-created
- C. The resource will be read
- D. The resource will be imported

**12.** You run `terraform apply tfplan` with a saved plan. What happens?
- A. Terraform re-plans and asks for confirmation
- B. Terraform applies the saved plan without prompting
- C. Terraform errors: saved plans can only be shown
- D. Terraform applies only after running `validate`

**13.** Which command is equivalent to `terraform destroy`?
- A. `terraform plan -destroy`
- B. `terraform apply -destroy`
- C. `terraform state rm -all`
- D. `terraform delete`

**14.** What is the default number of concurrent operations during apply?
- A. 1
- B. 5
- C. 10
- D. Unlimited

**15.** How do you reference the `id` attribute of a data source `aws_ami.ubuntu`?
- A. `aws_ami.ubuntu.id`
- B. `data.aws_ami.ubuntu.id`
- C. `data.ubuntu.id`
- D. `ami.ubuntu.id`

**16.** A variable is set in `terraform.tfvars`, as `TF_VAR_region`, and with `-var region=...`. Which value is used?
- A. `terraform.tfvars`
- B. `TF_VAR_region`
- C. `-var`
- D. The variable's default

**17.** Which type is appropriate for a variable holding `{ name = "web", port = 80, public = true }`?
- A. `map(string)`
- B. `list(any)`
- C. `object({ name = string, port = number, public = bool })`
- D. `set(string)`

**18.** You need to create one resource per entry in `var.users = ["alice", "bob"]` and avoid replacements when an entry is removed from the middle. What do you use?
- A. `count = length(var.users)`
- B. `for_each = toset(var.users)`
- C. A `dynamic` block
- D. `depends_on`

**19.** Which construct generates repeated nested blocks (e.g. multiple `ingress` blocks)?
- A. `for_each` on the resource
- B. `dynamic` block
- C. `count` on the nested block
- D. A `for` expression in a `locals` block

**20.** Resource B uses `aws_instance.a.private_ip` in its arguments. What kind of dependency is this?
- A. Explicit
- B. Implicit
- C. Circular
- D. None; Terraform creates them in parallel

**21.** Which lifecycle argument makes Terraform return an error if a plan would destroy the resource?
- A. `create_before_destroy`
- B. `ignore_changes`
- C. `prevent_destroy`
- D. `replace_triggered_by`

**22.** Which custom condition type only produces a warning and never blocks an apply?
- A. `validation`
- B. `precondition`
- C. `postcondition`
- D. `check` block

**23.** An output is marked `sensitive = true`. Which is TRUE?
- A. The value is encrypted in the state file
- B. The value is not stored in state
- C. The value is redacted in CLI output but stored in plain text in state
- D. The value cannot be referenced by other resources

**24.** Can you define custom functions in HCL?
- A. Yes, with a `function` block
- B. Yes, in `locals`
- C. No, only built-in functions (and provider-defined functions) are available
- D. Yes, using `terraform console`

**25.** Which is a valid local module source?
- A. `source = "modules/vpc"`
- B. `source = "./modules/vpc"`
- C. `source = "local::modules/vpc"`
- D. `source = "file:modules/vpc"`

**26.** A child module needs the value of the root module's `var.environment`. What must you do?
- A. Nothing; child modules inherit variables
- B. Reference `parent.var.environment`
- C. Declare a variable in the child and pass the value in the module block
- D. Use a `data` source

**27.** Which argument pins a Terraform Registry module to a version?
- A. `ref`
- B. `version`
- C. `tag`
- D. `pin`

**28.** How does the root module access a value created inside a child module named `db`?
- A. `module.db.aws_db_instance.this.endpoint`
- B. `module.db.<output_name>` via an output defined in the child
- C. `db.endpoint`
- D. `local.db.endpoint`

**29.** Where is state stored by default?
- A. In HCP Terraform
- B. In `terraform.tfstate` in the working directory
- C. In `.terraform/terraform.tfstate`
- D. In memory only

**30.** Which of the following can you NOT use in a `backend` block?
- A. String literals
- B. Input variables
- C. Boolean literals
- D. Partial configuration via `-backend-config`

**31.** Two engineers run `terraform apply` at the same time against the same S3 backend with locking enabled. What happens?
- A. Both applies run and the state is merged
- B. The second one fails to acquire the state lock
- C. The first one is cancelled
- D. The state is corrupted

**32.** A resource was modified manually in the console. You want to update the state to reflect reality without changing infrastructure. What do you run?
- A. `terraform apply -refresh-only`
- B. `terraform apply -replace`
- C. `terraform state push`
- D. `terraform init -reconfigure`

**33.** You want Terraform to stop managing a resource but leave it running. Which are valid approaches? *(Select TWO)*
- A. `terraform destroy -target`
- B. `terraform state rm`
- C. A `removed` block with `lifecycle { destroy = false }`
- D. `terraform taint`

**34.** Which block lets you rename a resource in configuration without destroying and re-creating it?
- A. `rename`
- B. `moved`
- C. `import`
- D. `alias`

**35.** Which command lists all resources tracked in state?
- A. `terraform show -list`
- B. `terraform state list`
- C. `terraform list`
- D. `terraform output -all`

**36.** You have an `import` block but no resource configuration yet. Which command generates the configuration?
- A. `terraform import -generate`
- B. `terraform plan -generate-config-out=generated.tf`
- C. `terraform init -import`
- D. `terraform show -config`

**37.** Which environment variable enables the most detailed logging?
- A. `TF_LOG=DEBUG`
- B. `TF_LOG=TRACE`
- C. `TF_DEBUG=1`
- D. `TF_LOG_PATH=trace`

**38.** Which block connects a configuration to HCP Terraform?
- A. `backend "hcp" {}`
- B. `cloud {}` inside the `terraform` block
- C. `provider "tfe" {}`
- D. `hcp {}`

**39.** When are Sentinel/OPA policies evaluated in an HCP Terraform run?
- A. Before plan
- B. Between plan and apply
- C. After apply
- D. Only on destroy

**40.** What does an HCP Terraform workspace contain that a CLI workspace does NOT? *(Select TWO)*
- A. State
- B. Variables
- C. Team access permissions
- D. A configuration directory

---
---

## Answers

| # | Ans | Explanation |
|---|---|---|
| 1 | B | Terraform is declarative. |
| 2 | A, B, D | IaC doesn't remove costs or the need to know the platform. |
| 3 | B | Resource types are provider-specific; only the workflow is portable. |
| 4 | C | The dependency lock file pins provider versions and hashes. |
| 5 | B | `~> 4.2.0` means `>= 4.2.0, < 4.3.0`. |
| 6 | C | `.terraform/providers` in the working directory (unless a plugin cache is configured). |
| 7 | B | `alias`, referenced as `aws.<alias>`. |
| 8 | C | `init` installs providers/modules and configures the backend. |
| 9 | A, B | validate is offline: no credentials, no API lookups, no state comparison. |
| 10 | B | `-check` returns non-zero if formatting is needed, without modifying files. |
| 11 | B | Replace: destroy then create. `+/-` is create-before-destroy. |
| 12 | B | Saved plans apply without a prompt. |
| 13 | B | `destroy` is an alias for `apply -destroy`. |
| 14 | C | `-parallelism` defaults to 10. |
| 15 | B | Data sources are prefixed with `data.`. |
| 16 | C | CLI `-var`/`-var-file` has the highest precedence. |
| 17 | C | Mixed types with fixed attribute names → `object`. |
| 18 | B | `for_each` gives stable addresses keyed by value. |
| 19 | B | `dynamic` blocks generate nested blocks. |
| 20 | B | References create implicit dependencies. |
| 21 | C | `prevent_destroy = true`. |
| 22 | D | `check` block assertions are warnings. |
| 23 | C | Sensitive only redacts output. |
| 24 | C | No user-defined functions in HCL. |
| 25 | B | Local paths must begin with `./` or `../`. |
| 26 | C | Modules only receive values through input variables. |
| 27 | B | `version` (registry sources only). Git uses `?ref=`. |
| 28 | B | Only outputs are exposed from a child module. |
| 29 | B | Local backend → `terraform.tfstate` in the root module directory. |
| 30 | B | Backend blocks can't reference variables, locals or data sources. |
| 31 | B | Locking prevents concurrent writes; the second operation errors (or waits with `-lock-timeout`). |
| 32 | A | Refresh-only updates state to match reality. |
| 33 | B, C | Both remove from state without destroying. |
| 34 | B | `moved` blocks record address changes. |
| 35 | B | `terraform state list`. |
| 36 | B | `-generate-config-out` on `plan`. |
| 37 | B | TRACE is the most verbose. |
| 38 | B | `terraform { cloud { ... } }`. |
| 39 | B | Policy checks run after plan, before apply. |
| 40 | B, C | CLI workspaces only separate state; HCP workspaces also hold variables, permissions, run history, settings. |

# Practice Exam 2

**40 questions · 45 minutes · pass mark: 70% (aim for 85%+)**
Answers and explanations are at the bottom.

---

**1.** Which Terraform component is responsible for communicating with a cloud platform's API?
- A. Terraform Core
- B. The state file
- C. A provider plugin
- D. The backend

**2.** How can Terraform help with a multi-cloud deployment?
- A. It automatically translates resources between clouds
- B. It provides one workflow and language to manage resources across providers in one configuration
- C. It replaces cloud-native services with generic ones
- D. It requires one Terraform installation per cloud

**3.** You omit `required_providers` and use a resource `random_pet`. What does Terraform assume?
- A. It fails immediately
- B. It installs `hashicorp/random`
- C. It prompts for the source
- D. It installs the newest community provider named random

**4.** Your lock file pins `hashicorp/aws 5.80.0`. The constraint is `~> 5.0`, and 5.95.0 is available. What does `terraform init` install?
- A. 5.95.0
- B. 5.80.0
- C. 6.0.0
- D. It errors

**5.** Which command upgrades providers to the latest versions allowed by constraints?
- A. `terraform upgrade`
- B. `terraform init -upgrade`
- C. `terraform providers update`
- D. `terraform get -update`

**6.** Which statements about state are TRUE? *(Select TWO)*
- A. State maps resources in configuration to real-world objects
- B. State is optional; Terraform can work by reading the cloud APIs only
- C. State may contain sensitive values in plain text
- D. State is always encrypted by the local backend

**7.** You changed a module's `version` argument. What must you run before `plan`?
- A. `terraform validate`
- B. `terraform init`
- C. `terraform refresh`
- D. Nothing

**8.** What does `terraform fmt` do by default?
- A. Formats files in the current directory only
- B. Formats all subdirectories recursively
- C. Validates the configuration
- D. Formats state files

**9.** You want the plan exit code to indicate whether there are changes. Which flag?
- A. `-changes-only`
- B. `-detailed-exitcode`
- C. `-json`
- D. `-check`

**10.** An apply fails halfway. What is true?
- A. Terraform rolls back all changes automatically
- B. Successfully created resources remain and are recorded in state
- C. The state file is deleted
- D. All resources are marked tainted

**11.** How do you force Terraform to replace a specific resource on the next apply?
- A. `terraform apply -replace=aws_instance.web`
- B. `terraform apply -recreate=aws_instance.web`
- C. `terraform state rm aws_instance.web`
- D. `terraform refresh aws_instance.web`

**12.** Which is TRUE about data sources?
- A. They create resources if they don't exist
- B. They let Terraform read information defined outside the configuration or computed by a provider
- C. They can only be used with the `aws` provider
- D. They are stored only in memory and never appear in state

**13.** Which variable files are loaded automatically? *(Select TWO)*
- A. `terraform.tfvars`
- B. `prod.tfvars`
- C. `dev.auto.tfvars`
- D. `variables.tf.vars`

**14.** A required variable has no default and no value provided. `-input=true` (default). What happens?
- A. Terraform uses `null`
- B. Terraform prompts for a value
- C. Terraform uses an empty string
- D. Terraform skips resources using it

**15.** What does `optional(number, 1)` in an object type mean?
- A. The attribute is required and must be 1
- B. The attribute may be omitted; if omitted it defaults to 1
- C. The attribute accepts numbers up to 1
- D. It's a list with one element

**16.** Given `var.names` is a `set(string)`, which expression is invalid?
- A. `length(var.names)`
- B. `var.names[0]`
- C. `tolist(var.names)[0]`
- D. `contains(var.names, "a")`

**17.** What does `[for s in var.list : upper(s) if s != ""]` return?
- A. A map
- B. A list of uppercase, non-empty strings
- C. A set of booleans
- D. An error: `if` is not allowed

**18.** What is the result of `aws_instance.web[*].id` when `count = 3`?
- A. The ID of the first instance
- B. A list of the three instance IDs
- C. A map keyed by index
- D. An error

**19.** Which statement about `count` and `for_each` is TRUE?
- A. They can be used together on the same resource
- B. `for_each` accepts a map or a set of strings
- C. `count` accepts a map
- D. `for_each` keys can be unknown until apply

**20.** When should you use `depends_on`?
- A. Always, to make dependencies explicit
- B. When a dependency exists that Terraform cannot infer from references
- C. To speed up applies
- D. To create resources in parallel

**21.** Which `lifecycle` setting avoids downtime by creating a replacement before destroying the original?
- A. `prevent_destroy`
- B. `create_before_destroy`
- C. `ignore_changes`
- D. `replace_triggered_by`

**22.** Where can you use `self` in a custom condition?
- A. In a variable `validation`
- B. In a `precondition`
- C. In a `postcondition`
- D. In a `check` block assertion

**23.** Which options keep a secret out of the state file? *(Select TWO)*
- A. `sensitive = true` on a variable
- B. An ephemeral variable/resource
- C. A write-only argument
- D. Wrapping the value in `nonsensitive()`

**24.** How does HashiCorp Vault improve secrets handling with Terraform?
- A. It encrypts `.tf` files
- B. It can issue short-lived dynamic credentials that Terraform reads at run time
- C. It replaces the state backend
- D. It removes the need for providers

**25.** Which is a valid Git module source pinned to a tag?
- A. `source = "git::https://example.com/net.git" version = "v1.0.0"`
- B. `source = "git::https://example.com/net.git?ref=v1.0.0"`
- C. `source = "git::https://example.com/net.git#v1.0.0"`
- D. `source = "git::https://example.com/net.git@v1.0.0"`

**26.** What is the naming convention for a module repository published to the public registry?
- A. `module-<name>-<provider>`
- B. `terraform-<provider>-<name>`
- C. `<provider>-terraform-<name>`
- D. Any name

**27.** Child modules and providers — which is TRUE?
- A. Child modules must always declare their own `provider` blocks
- B. Child modules inherit default provider configurations from the parent; aliased ones must be passed with `providers`
- C. Providers can't be used in modules
- D. Each module downloads its own provider binary

**28.** Which command downloads modules but does not initialize backends or providers?
- A. `terraform get`
- B. `terraform fetch`
- C. `terraform modules`
- D. `terraform init -modules-only`

**29.** Which is a benefit of remote state backends? *(Select TWO)*
- A. Team members share the same state
- B. Locking prevents concurrent writes (backend-dependent)
- C. They make state files human-editable
- D. They remove secrets from state

**30.** You changed the backend from local to S3. What command migrates the existing state?
- A. `terraform state push`
- B. `terraform init -migrate-state`
- C. `terraform apply -migrate`
- D. `terraform backend migrate`

**31.** A crashed CI job left a stale lock on state. How do you remove it?
- A. `terraform unlock`
- B. `terraform force-unlock LOCK_ID`
- C. Delete `.terraform/`
- D. `terraform state rm lock`

**32.** Which data source reads outputs from another configuration's state?
- A. `terraform_state`
- B. `terraform_remote_state`
- C. `remote_outputs`
- D. `state_outputs`

**33.** What is the preferred replacement for `terraform taint`?
- A. `terraform untaint`
- B. `terraform apply -replace=ADDR`
- C. `terraform state rm`
- D. `terraform refresh`

**34.** You ran `terraform import aws_s3_bucket.logs my-logs`. What happened?
- A. The bucket configuration was written to `main.tf`
- B. The bucket was added to state; config must already exist
- C. A new bucket was created
- D. The bucket was destroyed and recreated

**35.** Which command shows every attribute of a single resource in state?
- A. `terraform state show ADDR`
- B. `terraform show ADDR`
- C. `terraform output ADDR`
- D. `terraform state pull ADDR`

**36.** You set `TF_LOG_PATH=./tf.log` but no log file is created. Why?
- A. The path must be absolute
- B. `TF_LOG` is not set
- C. Logs are only written on crash
- D. `TF_LOG_PATH` only works in HCP Terraform

**37.** What happens to a pull request opened against a VCS-connected HCP Terraform workspace?
- A. It's applied automatically
- B. A speculative plan runs and its result is reported to the PR
- C. Nothing until merged
- D. The workspace is locked

**38.** Which Sentinel enforcement level can be overridden by an authorized user?
- A. advisory
- B. soft-mandatory
- C. hard-mandatory
- D. none

**39.** What organizes HCP Terraform workspaces into groups for access management?
- A. Tags
- B. Projects
- C. Teams
- D. Variable sets

**40.** Which HCP Terraform execution mode lets runs reach resources in a private data center?
- A. Remote
- B. Local
- C. Agent
- D. Speculative

---
---

## Answers

| # | Ans | Explanation |
|---|---|---|
| 1 | C | Providers translate resources into API calls. |
| 2 | B | Same workflow/language; resources are still provider-specific. |
| 3 | B | Terraform infers `hashicorp/<prefix>` when not declared. |
| 4 | B | The lock file wins until you run `init -upgrade`. |
| 5 | B | `init -upgrade`. |
| 6 | A, C | State is required, and the local backend does not encrypt. |
| 7 | B | Module or provider changes need `init`. |
| 8 | A | Use `-recursive` for subdirectories. |
| 9 | B | 0 = no changes, 1 = error, 2 = changes. |
| 10 | B | No rollback; partial results are saved to state. |
| 11 | A | `-replace`. |
| 12 | B | Data sources read and never manage. They are recorded in state. |
| 13 | A, C | `terraform.tfvars` and `*.auto.tfvars`; others need `-var-file`. |
| 14 | B | Interactive prompt (or error with `-input=false`). |
| 15 | B | Optional attribute with a default. |
| 16 | B | Sets aren't indexable. |
| 17 | B | A list, with filtering by `if`. |
| 18 | B | Splat returns a list. |
| 19 | B | Map or set of strings; keys must be known at plan time; can't combine with count. |
| 20 | B | Hidden dependencies only. |
| 21 | B | `create_before_destroy`. |
| 22 | C | `self` is available in postconditions (and provisioners). |
| 23 | B, C | `sensitive` only redacts; `nonsensitive` removes redaction. |
| 24 | B | Dynamic, short-lived secrets reduce exposure. |
| 25 | B | `?ref=` for Git; `version` is registry-only. |
| 26 | B | `terraform-<PROVIDER>-<NAME>`. |
| 27 | B | Default configs are inherited; aliases are passed explicitly. |
| 28 | A | `terraform get`. |
| 29 | A, B | Remote state is still sensitive and must not be hand-edited. |
| 30 | B | `init -migrate-state` (init prompts to migrate). |
| 31 | B | `force-unlock` with the lock ID. |
| 32 | B | `terraform_remote_state` (root outputs only). |
| 33 | B | `-replace` shows the replacement in the plan. |
| 34 | B | CLI import only writes state. |
| 35 | A | `state show`. |
| 36 | B | `TF_LOG_PATH` requires `TF_LOG`. |
| 37 | B | Speculative plan (plan-only). |
| 38 | B | Soft-mandatory can be overridden; hard-mandatory cannot; advisory only warns. |
| 39 | B | Projects. |
| 40 | C | Agents run inside your network. |

# Lesson 07 — Maintaining Infrastructure with Terraform

**Objectives covered:** 7a–7c · **Time:** ~1.5 h

## 1. Importing existing infrastructure

Import brings an existing real-world object under Terraform management **by adding it to state**.

### 1.1 `import` block (config-driven, Terraform 1.5+) — preferred

```hcl
import {
  to = aws_instance.web          # resource address in your config
  id = "i-0abc123def456"         # provider-specific ID of the existing object
}

resource "aws_instance" "web" {
  # ... config matching the real object
}
```

- Import happens during **`plan` / `apply`** — reviewable in the plan (`will be imported`), works in CI and HCP Terraform.
- Can import many resources at once; supports `for_each` in import blocks (1.7+).
- **Generate the config automatically:**
  ```bash
  terraform plan -generate-config-out=generated.tf
  ```
  Terraform writes resource blocks for import targets that have no config yet. Review and clean up the output
  (it's a starting point, may contain conflicting/default attributes).
- After a successful apply the `import` block can be removed (or kept as a record — it's a no-op).

### 1.2 `terraform import` command (legacy CLI)

```bash
terraform import aws_instance.web i-0abc123def456
terraform import 'aws_instance.web["a"]' i-0abc123def456     # quote for for_each keys
terraform import module.app.aws_instance.web i-0abc123def456
```
- You must **write the resource block first** — the command does not generate config.
- Imports **one resource at a time**, writes straight to state, no plan preview.
- After importing, run `terraform plan` to check the config matches reality (aim for "No changes").

Common to both: import only affects **state**; Terraform does **not** create or modify the real object during
import. Not all resource types support import (check provider docs for the ID format).

## 2. Using the CLI to inspect state

| Question | Command |
|---|---|
| What resources are managed? | `terraform state list` |
| All attributes of one resource? | `terraform state show 'aws_instance.web'` |
| Whole state, human-readable? | `terraform show` |
| Machine-readable state/plan? | `terraform show -json [planfile]` |
| Root module outputs? | `terraform output`, `terraform output -json`, `terraform output -raw name` |
| Evaluate expressions against state? | `terraform console` |
| Raw state JSON (remote too)? | `terraform state pull` |
| What providers are required? | `terraform providers` |
| Which version of core/providers? | `terraform version` |
| Dependency graph? | `terraform graph` |

## 3. Verbose logging and debugging

Terraform logs are controlled by environment variables:

| Variable | Purpose |
|---|---|
| `TF_LOG` | Log level: **`TRACE`** (most verbose), `DEBUG`, `INFO`, `WARN`, `ERROR`, or `OFF`. `JSON` = TRACE in JSON format |
| `TF_LOG_CORE` | Level for Terraform core only |
| `TF_LOG_PROVIDER` | Level for providers only |
| `TF_LOG_PATH` | Write logs to this file (**requires `TF_LOG` to be set**) |

```bash
export TF_LOG=TRACE
export TF_LOG_PATH=./terraform-debug.log
terraform apply
unset TF_LOG TF_LOG_PATH
```

- Logs go to **stderr** by default.
- Any non-empty value other than a valid level is treated as `TRACE`.
- If Terraform **crashes** (panics), it writes `crash.log` with the stack trace — attach it when filing a bug.
- Useful when: provider/API errors are unclear, auth problems, slow operations, reporting bugs.
- Logs may contain secrets — don't share them blindly.

## 4. Other maintenance tasks

- **Upgrading providers:** bump the constraint → `terraform init -upgrade` → `plan` → commit the lock file.
- **Upgrading Terraform:** read the upgrade guide, update `required_version`, run plan, fix deprecations.
  Terraform 1.x has a compatibility promise for the language and state within 1.x.
- **Replacing a broken resource:** `terraform apply -replace=ADDR`.
- **Targeting:** `-target=ADDR` only for exceptional recovery; not routine use.
- **Testing:** `terraform test` with `*.tftest.hcl` files (`run` blocks with `command = plan|apply` and `assert`s).
- **Formatting/validation in CI:** `terraform fmt -check -recursive`, `terraform validate`.

## Key takeaways

- Prefer `import` blocks + `plan -generate-config-out`; the `terraform import` CLI needs config written first.
- Import changes state only.
- `TF_LOG=TRACE` most verbose; `TF_LOG_PATH` needs `TF_LOG`.
- Crash → `crash.log`.

## Review quiz

Pick the best answer for each question. Answers and explanations are at the bottom;
on the training website this quiz is interactive and scored.

**1.** Which command generates HCL for resources declared in `import` blocks?
- A. `terraform import -generate`
- B. `terraform plan -generate-config-out=generated.tf`
- C. `terraform init -import`
- D. `terraform show -config`

**2.** Does the `terraform import` CLI command write the resource configuration for you?
- A. Yes
- B. No

**3.** What does an import modify?
- A. The real resource
- B. Only the state
- C. Both the real resource and the state
- D. The configuration and the state

**4.** What is the most verbose log level?
- A. `DEBUG`
- B. `TRACE`
- C. `INFO`
- D. `ALL`

**5.** You set `TF_LOG_PATH=tf.log` but no file appears. Why?
- A. `TF_LOG` isn't set, and `TF_LOG_PATH` has no effect without it
- B. The path must be absolute
- C. Logging only works in HCP Terraform
- D. You also need the `-verbose` flag

**6.** Which file does Terraform write when it panics?
- A. `panic.log`
- B. `crash.log`
- C. `terraform.log`
- D. `error.tfstate`

**7.** Which command shows all the attributes of `aws_s3_bucket.logs` from state?
- A. `terraform show aws_s3_bucket.logs`
- B. `terraform state show aws_s3_bucket.logs`
- C. `terraform state list aws_s3_bucket.logs`
- D. `terraform output aws_s3_bucket.logs`

**8.** After an import, how do you confirm your configuration matches the real object?
- A. Run `terraform plan` and expect no changes
- B. Run `terraform validate`
- C. Run `terraform state pull`
- D. Run `terraform fmt`

<details><summary>Answers</summary>

| # | Ans | Explanation |
|---|---|---|
| 1 | B | Review and clean up the generated file before applying. |
| 2 | B | You must write the resource block yourself. Only `import` blocks with `-generate-config-out` can generate it. |
| 3 | B | Import records an existing object in state. It never changes the infrastructure. |
| 4 | B | From most to least verbose: TRACE, DEBUG, INFO, WARN, ERROR. |
| 5 | A | Set a level such as `TF_LOG=DEBUG` as well. |
| 6 | B | `crash.log` holds the debug log and stack trace to attach to a bug report. |
| 7 | B | `state show ADDR` prints one resource. `state list` lists addresses only; `terraform show` takes a plan or state file, not an address. |
| 8 | A | Any planned change means your configuration still differs from the imported object. |
</details>

➡️ Lab: [lab/LAB.md](lab/LAB.md)

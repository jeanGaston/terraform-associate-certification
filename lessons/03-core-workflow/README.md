# Lesson 03 — The Core Terraform Workflow

**Objectives covered:** 3a–3g · **Time:** ~1 h

## 1. Write → Plan → Apply

| Stage | Individual | Team | HCP Terraform |
|---|---|---|---|
| **Write** | Edit `.tf` in your editor | Branch + edit | Branch + edit |
| **Plan** | `terraform plan` locally, iterate | Plan output posted in a pull request for review | Speculative plan runs on the PR automatically |
| **Apply** | `terraform apply` | Merge, then apply from CI | Merge triggers a run; apply after approval |

The full CLI lifecycle: `init` → (`fmt`, `validate`) → `plan` → `apply` → … → `destroy`.

## 2. `terraform init`

Initializes a working directory. **Always the first command** and safe to run many times (idempotent).

It:
- Initializes the **backend** (where state lives).
- Downloads **providers** → `.terraform/providers/` and writes/updates `.terraform.lock.hcl`.
- Downloads **modules** → `.terraform/modules/`.
- Does **not** create any infrastructure and does **not** create a state file for the local backend.

Must be re-run when you: add/change a provider or module source/version, or change the backend.

Useful flags:
| Flag | Purpose |
|---|---|
| `-upgrade` | Upgrade providers and modules to newest allowed versions |
| `-reconfigure` | Reconfigure backend, ignoring existing configuration (no state migration) |
| `-migrate-state` | Migrate state to a new backend |
| `-backend=false` | Skip backend initialization |
| `-backend-config=path_or_kv` | Partial backend configuration |
| `-get=false` | Skip module download |

## 3. `terraform validate`

- Checks **syntax** and **internal consistency** (types, required args, references to undeclared variables).
- Requires `init` first (needs provider schemas).
- Does **not** access remote services, state, or check whether values are valid for the real API
  (e.g. won't catch an invalid AMI ID).
- `terraform validate -json` for CI.

## 4. `terraform fmt`

- Rewrites files to the **canonical HCL style** (indentation, alignment of `=`).
- Only formats the current directory by default; `-recursive` for subdirectories.
- `-check` → exit code non-zero if files need formatting (doesn't modify) — perfect for CI.
- `-diff` → show changes.
- Does **not** validate logic.

## 5. `terraform plan`

Creates an **execution plan**:
1. Reads current state.
2. **Refreshes** — queries providers for the real status of managed objects.
3. Compares desired config vs. current state → proposes create/update/replace/destroy.

Plan symbols:
| Symbol | Meaning |
|---|---|
| `+` | create |
| `-` | destroy |
| `~` | update in-place |
| `-/+` | destroy then create (replace) |
| `+/-` | create then destroy (replace with `create_before_destroy`) |
| `<=` | read (data source) |

Useful flags:
| Flag | Purpose |
|---|---|
| `-out=tfplan` | Save the plan to a file for a later exact `apply` |
| `-destroy` | Plan a destroy |
| `-refresh-only` | Only update state to match reality; propose no infra changes |
| `-refresh=false` | Skip refresh (faster, riskier) |
| `-target=ADDR` | Focus on a resource (exceptional use only) |
| `-replace=ADDR` | Force replacement of a resource |
| `-var 'k=v'` / `-var-file=f.tfvars` | Set variables |
| `-detailed-exitcode` | Exit 0 = no changes, 1 = error, 2 = changes present |
| `-parallelism=n` | Concurrent operations (default **10**) |
| `-generate-config-out=file.tf` | Generate config for `import` blocks (Lesson 07) |

`plan` **never modifies real infrastructure**. (A saved plan file can contain sensitive values — protect it.)

## 6. `terraform apply`

- Without a plan file: creates a new plan, shows it, and asks for **`yes`** confirmation.
- `-auto-approve` skips the prompt (CI only).
- `terraform apply tfplan` applies a **saved plan** without prompting and without re-planning.
  If state changed since the plan was made, Terraform rejects it as stale.
- Accepts most plan flags (`-var`, `-target`, `-replace`, `-refresh-only`, `-parallelism`).
- If apply fails partway, resources already created remain and are recorded in state;
  Terraform does **not** roll back. Fix and apply again.
- Resources whose creation-time provisioner fails are marked **tainted** and replaced next apply.

## 7. `terraform destroy`

- Destroys **all** resources tracked in the current state/workspace.
- Alias for `terraform apply -destroy`. Preview with `terraform plan -destroy`.
- Asks for confirmation (`-auto-approve` to skip).
- To destroy just one resource: remove it from the config and apply (preferred) or `-target` (exceptional).

## 8. Other workflow commands worth knowing

| Command | Does |
|---|---|
| `terraform show` | Human-readable view of state or a saved plan (`-json` for machines) |
| `terraform output [name]` | Print outputs from state (`-raw`, `-json`) |
| `terraform console` | Interactive REPL to evaluate expressions and functions |
| `terraform graph` | Emits dependency graph in DOT format |
| `terraform providers` | Show provider requirements |
| `terraform get` | Download/update modules only |
| `terraform test` | Run `.tftest.hcl` tests |
| `terraform login` / `logout` | Obtain/remove an API token for HCP Terraform |

## Key takeaways

- `init` first; re-run after provider/module/backend changes.
- `validate` = offline syntax + consistency; `fmt` = style only.
- `plan` refreshes by default and never changes infra; `apply` can use a saved plan (no prompt).
- `destroy` = `apply -destroy`.

## Review quiz

Pick the best answer for each question. Answers and explanations are at the bottom;
on the training website this quiz is interactive and scored.

**1.** Which command downloads the providers and modules a configuration needs?
- A. `terraform plan`
- B. `terraform init`
- C. `terraform validate`
- D. `terraform fmt`

**2.** Does `terraform validate` check whether an AMI ID actually exists?
- A. Yes
- B. No

**3.** Which `fmt` flag makes a CI pipeline fail when code isn't formatted?
- A. `-diff`
- B. `-check`
- C. `-write=true`
- D. `-list`

**4.** What does `-/+` mean in plan output?
- A. The resource is updated in place
- B. The resource is destroyed, then re-created (replacement)
- C. The resource is created first, then the old one destroyed
- D. A data source is read

**5.** You ran `terraform plan -out=tfplan`. What does `terraform apply tfplan` do?
- A. Re-plans and asks for confirmation
- B. Applies exactly that saved plan, without a confirmation prompt
- C. Fails, because saved plans can only be shown
- D. Applies only after re-running `validate`

**6.** What is the default value of `-parallelism`?
- A. 1
- B. 5
- C. 10
- D. Unlimited

**7.** An apply fails after creating 3 of 5 resources. What happens to the 3?
- A. Terraform automatically destroys them (rollback)
- B. They remain and are recorded in state
- C. They remain but are not recorded in state
- D. The state is reverted to its pre-apply version

**8.** Which command is equivalent to `terraform destroy`?
- A. `terraform apply -destroy`
- B. `terraform plan -destroy`
- C. `terraform apply -delete`
- D. `terraform state rm -all`

<details><summary>Answers</summary>

| # | Ans | Explanation |
|---|---|---|
| 1 | B | `init` installs providers and modules and configures the backend. `terraform get` fetches modules only. |
| 2 | B | `validate` is offline: it checks syntax and internal consistency, never remote APIs or credentials. |
| 3 | B | `-check` exits non-zero if any file needs formatting, without modifying files. Often combined with `-recursive`. |
| 4 | B | `-/+` is a replacement. `+/-` is create-before-destroy, `~` is update in place, `<=` is a data source read. |
| 5 | B | A saved plan was already reviewed, so Terraform applies it as-is without prompting. |
| 6 | C | Terraform walks the graph with up to 10 concurrent operations by default. |
| 7 | B | There is no rollback. Fix the error and apply again; Terraform continues from what the state records. |
| 8 | A | `destroy` is an alias for `apply -destroy`. `plan -destroy` only previews the destruction. |
</details>

➡️ Lab: [lab/LAB.md](lab/LAB.md)

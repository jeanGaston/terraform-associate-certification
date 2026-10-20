# Lesson 06 — Terraform State Management

**Objectives covered:** 6a–6d · **Time:** ~2 h

## 1. Backends

A **backend** defines **where state is stored** (and, for some, where locking happens).

### 1.1 The local backend (default)
- Used when no `backend` block or `cloud` block exists.
- State stored in `terraform.tfstate` in the root module directory; previous state in `terraform.tfstate.backup`.
- Locks using OS-level file locking on the local system.
- Fine for learning / solo work; bad for teams (no sharing, easy to lose, secrets on laptops).
- Can be configured explicitly:
  ```hcl
  terraform {
    backend "local" {
      path = "state/dev.tfstate"
    }
  }
  ```
- With CLI workspaces, non-default workspace states live in `terraform.tfstate.d/<workspace>/terraform.tfstate`.

### 1.2 Remote backends
Common: `s3`, `azurerm`, `gcs`, `consul`, `kubernetes`, `pg`, `http`, `remote` (legacy, HCP Terraform), plus the
`cloud` block for HCP Terraform (preferred for HCP).

Benefits: **shared** state for teams, **locking**, **encryption at rest**, versioning/backups,
secrets not on laptops.

```hcl
terraform {
  backend "s3" {
    bucket       = "acme-terraform-state"
    key          = "network/prod/terraform.tfstate"
    region       = "eu-west-1"
    encrypt      = true
    use_lockfile = true          # S3-native locking (DynamoDB locking is deprecated)
  }
}
```

Rules:
- Only **one** backend block per configuration.
- Backend blocks **cannot use variables, locals, or data source references** (evaluated before everything else).
- Changing the backend requires `terraform init`; Terraform offers to **migrate** existing state
  (`-migrate-state`), or `-reconfigure` to ignore the existing one.
- **Partial configuration**: leave out sensitive/dynamic settings and supply them at init:
  ```bash
  terraform init -backend-config="bucket=acme-state" -backend-config=backend.hcl
  ```
  Credentials should come from env vars or credential files, not the backend block (backend config is stored in
  `.terraform/` and in plan files).

### 1.3 Reading another configuration's state
```hcl
data "terraform_remote_state" "network" {
  backend = "s3"
  config = {
    bucket = "acme-terraform-state"
    key    = "network/prod/terraform.tfstate"
    region = "eu-west-1"
  }
}
# data.terraform_remote_state.network.outputs.vpc_id   (only ROOT-module OUTPUTS are accessible)
```
In HCP Terraform, prefer the `tfe_outputs` data source. Note that access to remote state requires access to the whole
state snapshot, which may include secrets.

## 2. State locking

- Prevents concurrent operations from corrupting state (two `apply`s at once).
- Happens **automatically** for any operation that could write state (`plan`, `apply`, `destroy`, `state` cmds…) —
  *if the backend supports locking* (local, s3, azurerm, gcs, consul, HCP Terraform… do).
- If locking fails, Terraform stops (doesn't continue).
- `-lock=false` disables locking (dangerous). `-lock-timeout=60s` waits for a lock.
- A stuck lock (e.g. crashed process) → `terraform force-unlock <LOCK_ID>`. Only use when you're sure no one else
  is running; it doesn't touch the other process. Only needed/usable for backends where locking is supported.

## 3. Inspecting and modifying state (CLI)

| Command | Purpose |
|---|---|
| `terraform state list` | List resource addresses in state (supports filter: `state list module.vpc`) |
| `terraform state show ADDR` | Show attributes of one resource |
| `terraform show` | Show the whole state (or a saved plan) in human form; `-json` for machines |
| `terraform state mv SRC DST` | Rename/move a resource address in state (prefer `moved` block) |
| `terraform state rm ADDR` | Stop managing a resource **without destroying it** (prefer `removed` block) |
| `terraform state pull` | Output the current (remote) state as JSON to stdout |
| `terraform state push FILE` | Overwrite remote state with a local file (dangerous; protects against lineage/serial mismatches unless `-force`) |
| `terraform state replace-provider A B` | Change the provider source of resources in state |
| `terraform import ADDR ID` | Import existing object into state (prefer `import` block — Lesson 07) |
| `terraform output` | Read root outputs from state |

`state` subcommands that modify state write a backup automatically (for the local backend).

## 4. Config-driven refactoring: `moved` and `removed` blocks

```hcl
# Rename without destroy/recreate
moved {
  from = aws_instance.web
  to   = aws_instance.app
}

# Also for count → for_each and into modules
moved {
  from = aws_instance.app[0]
  to   = aws_instance.app["primary"]
}
moved {
  from = aws_s3_bucket.logs
  to   = module.logging.aws_s3_bucket.this
}

# Stop managing a resource but keep the real object (1.7+)
removed {
  from = aws_instance.legacy
  lifecycle {
    destroy = false
  }
}
```
Advantages over `state mv` / `state rm`: reviewable in PRs, visible in `plan`, works in HCP Terraform
and for module consumers.

## 5. Drift

**Drift** = real infrastructure changed outside Terraform (console clicks, other tools, deleted resources).

How Terraform handles it:
- Every `plan`/`apply` **refreshes** by default → detects drift and plans to bring reality back to the config.
- `terraform plan -refresh-only` → shows how **state** would be updated to match reality, with no infra changes.
- `terraform apply -refresh-only` → accepts the real-world changes into state (replaces the deprecated
  `terraform refresh` command, which applies without review).
- After a refresh-only apply, update your config to match if you want to keep the change; otherwise the next normal
  apply reverts it.
- `lifecycle { ignore_changes = [...] }` for attributes legitimately managed elsewhere (e.g. autoscaling `desired_count`).
- If the object was **deleted** outside Terraform, refresh removes it from state and the plan recreates it.
- HCP Terraform has **health assessments / drift detection** that check periodically (Lesson 08).

### Forcing replacement
- `terraform apply -replace="aws_instance.web"` — preferred; shows in plan.
- `terraform taint` / `untaint` — **deprecated** in favour of `-replace`.

## 6. State file facts to memorize

- Format: JSON. Contains `version`, `terraform_version`, `serial` (increments each write), `lineage`
  (unique ID of the state's history), `outputs`, `resources`.
- **May contain secrets in plain text** → encrypt at rest, restrict access, never commit to VCS.
- Terraform needs state to work; it is **not** optional. Don't edit manually.
- Workspaces (CLI): `terraform workspace new|select|list|show|delete` — multiple state files for **one**
  configuration and backend. `default` workspace always exists and can't be deleted.
  `terraform.workspace` returns the current name. Not suitable for strong isolation (same backend/credentials).

## Key takeaways

- Default = local backend, `terraform.tfstate`.
- Remote backends: share + lock + encrypt. No variables in backend blocks. Change backend → `init`.
- Locking is automatic where supported; `force-unlock` for stuck locks.
- `-refresh-only` for drift; `-replace` instead of `taint`; `moved`/`removed` instead of `state mv`/`rm`.

## Review quiz

Pick the best answer for each question. Answers and explanations are at the bottom;
on the training website this quiz is interactive and scored.

**1.** Where does the local backend store state by default?
- A. `~/.terraform.d/terraform.tfstate`
- B. `terraform.tfstate` in the root module's working directory
- C. `.terraform/terraform.tfstate`
- D. In HCP Terraform

**2.** Can you use `var.bucket_name` inside a `backend "s3"` block?
- A. Yes
- B. Yes, but only if the variable has a default
- C. No — backend blocks can't reference variables; use partial configuration with `-backend-config`
- D. Only through a `locals` block

**3.** You change the backend block and run `terraform plan` without running `init`. What happens?
- A. The plan runs against the old backend
- B. Terraform migrates the state automatically
- C. An error says the backend configuration changed and asks you to run `terraform init`
- D. The state is deleted

**4.** Which command releases a stuck state lock?
- A. `terraform unlock`
- B. `terraform force-unlock LOCK_ID`
- C. `terraform state unlock`
- D. Deleting the `.terraform` directory

**5.** What is the safe way to accept manual changes into state without modifying infrastructure?
- A. `terraform apply -refresh-only`
- B. `terraform apply -auto-approve`
- C. `terraform import`
- D. `terraform state push`

**6.** How can you stop managing a resource without destroying it? *(Select TWO)*
- A. `terraform state rm`
- B. A `removed` block with `lifecycle { destroy = false }`
- C. `terraform destroy -target`
- D. Delete the resource block and run `terraform apply`

**7.** What replaced `terraform taint`?
- A. `terraform apply -replace=ADDR`
- B. `terraform state mv`
- C. `terraform refresh`
- D. `terraform untaint`

**8.** Which values can `terraform_remote_state` read from another configuration?
- A. Every resource attribute
- B. Only the root module outputs
- C. Its input variables
- D. Outputs of any module, including child modules

**9.** Does `terraform state rm` delete the real resource?
- A. Yes
- B. No

**10.** Which state file field increments on every write?
- A. `lineage`
- B. `serial`
- C. `version`
- D. `terraform_version`

<details><summary>Answers</summary>

| # | Ans | Explanation |
|---|---|---|
| 1 | B | The default local backend writes `terraform.tfstate` next to your configuration (CLI workspaces use `terraform.tfstate.d/`). |
| 2 | C | The backend is configured before variables are evaluated, so it can't use variables, locals or data sources. |
| 3 | C | Run `terraform init -migrate-state` to move the state, or `-reconfigure` to start fresh. |
| 4 | B | Only use it for stale locks left by crashed processes, never while another run is active. |
| 5 | A | A refresh-only run updates state to match reality and shows you what changed before you approve it. |
| 6 | A, B | Both forget the object while leaving it running. Deleting the block and applying would destroy it. |
| 7 | A | `-replace` forces replacement as part of a normal plan, so you see the impact before applying. |
| 8 | B | Only root-level outputs are exposed. Child module outputs must be re-exported by the root module. |
| 9 | B | It only removes the object from state; the infrastructure keeps running unmanaged. |
| 10 | B | `serial` increases with each write. `lineage` is a unique ID set when the state is first created. |
</details>

➡️ Lab: [lab/LAB.md](lab/LAB.md)

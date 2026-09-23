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

1. Where does the local backend store state by default?
2. Can you use `var.bucket_name` inside a `backend "s3"` block?
3. What happens after you change the backend block and run `terraform plan` without `init`?
4. Which command releases a stuck lock?
5. What's the safe way to accept manual changes into state without modifying infrastructure?
6. How do you stop managing a resource without destroying it (two ways)?
7. What replaced `terraform taint`?
8. Which values from another state can `terraform_remote_state` read?
9. Does `terraform state rm` delete the real resource?
10. Which state file field increments on every write?

<details><summary>Answers</summary>

1. `terraform.tfstate` in the root module (working) directory.
2. No — backend config can't reference variables; use partial configuration with `-backend-config`.
3. Error: backend configuration changed, run `terraform init` (with `-migrate-state` or `-reconfigure`).
4. `terraform force-unlock LOCK_ID`.
5. `terraform apply -refresh-only`.
6. `removed { from = ... lifecycle { destroy = false } }` block, or `terraform state rm`.
7. `terraform apply -replace=ADDR`.
8. Only the root module outputs.
9. No.
10. `serial`.
</details>

➡️ Lab: [lab/LAB.md](lab/LAB.md)

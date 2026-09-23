# Terraform CLI Cheatsheet

## Workflow
```bash
terraform init                       # backend + providers + modules; re-run after changes to any of them
terraform init -upgrade              # newest allowed provider/module versions
terraform init -migrate-state        # move state to a new backend
terraform init -reconfigure          # re-init backend, ignore existing config
terraform init -backend-config=backend.hcl

terraform fmt [-recursive] [-check] [-diff]
terraform validate [-json]

terraform plan [-out=tfplan] [-var k=v] [-var-file=f.tfvars]
terraform plan -destroy | -refresh-only | -refresh=false
terraform plan -replace=ADDR | -target=ADDR
terraform plan -detailed-exitcode    # 0 none, 1 error, 2 changes
terraform plan -generate-config-out=generated.tf

terraform apply [tfplan] [-auto-approve] [-parallelism=10]
terraform apply -refresh-only
terraform apply -replace=ADDR
terraform destroy [-auto-approve]    # == terraform apply -destroy
```

## Inspect
```bash
terraform show [tfplan] [-json]
terraform output [NAME] [-raw|-json]
terraform state list [FILTER]
terraform state show ADDR
terraform state pull
terraform console
terraform graph | dot -Tsvg > graph.svg
terraform providers
terraform version
```

## Modify state (prefer config blocks where possible)
```bash
terraform state mv SRC DST                  # prefer: moved {}
terraform state rm ADDR                     # prefer: removed {}
terraform import ADDR ID                    # prefer: import {}
terraform state push FILE                   # dangerous
terraform state replace-provider OLD NEW
terraform force-unlock LOCK_ID
terraform taint ADDR / untaint ADDR         # deprecated → -replace
terraform refresh                           # deprecated → apply -refresh-only
```

## Workspaces (CLI)
```bash
terraform workspace list | show | new NAME | select NAME | delete NAME
```

## HCP Terraform
```bash
terraform login [hostname]
terraform logout
```

## Providers
```bash
terraform providers lock -platform=linux_amd64 -platform=darwin_arm64
terraform providers mirror ./mirror
```

## Testing
```bash
terraform test                       # runs *.tftest.hcl
```

## Environment variables
| Var | Purpose |
|---|---|
| `TF_LOG` | TRACE, DEBUG, INFO, WARN, ERROR, OFF, JSON |
| `TF_LOG_CORE` / `TF_LOG_PROVIDER` | Per-component log level |
| `TF_LOG_PATH` | Log file (needs `TF_LOG`) |
| `TF_VAR_name` | Set input variable `name` |
| `TF_INPUT=0` | Disable interactive prompts |
| `TF_CLI_ARGS`, `TF_CLI_ARGS_plan` | Extra CLI args |
| `TF_DATA_DIR` | Change `.terraform` location |
| `TF_WORKSPACE` | Select workspace |
| `TF_PLUGIN_CACHE_DIR` | Shared provider cache |
| `TF_CLOUD_ORGANIZATION`, `TF_CLOUD_HOSTNAME` | `cloud` block defaults |
| `TF_IN_AUTOMATION` | Less interactive-oriented output |

## Files
| File | Commit to Git? |
|---|---|
| `*.tf` | ✅ |
| `.terraform.lock.hcl` | ✅ |
| `.terraform/` | ❌ |
| `terraform.tfstate`, `*.tfstate.backup` | ❌ |
| `*.tfvars` with secrets | ❌ |
| `crash.log` | ❌ |
| Saved plan files | ❌ (may contain secrets) |

# State & Backends Cheatsheet

## Defaults
- Backend: **local** → `./terraform.tfstate` (+ `terraform.tfstate.backup`)
- CLI workspace states: `terraform.tfstate.d/<name>/terraform.tfstate`
- Refresh happens on every `plan`/`apply` unless `-refresh=false`

## Purpose of state
1. Map config ↔ real objects  2. Metadata (dependencies)  3. Performance cache  4. Team sync (remote)

## Backend rules
- One backend per configuration; `cloud` and `backend` are mutually exclusive
- No variables/locals/data in backend blocks → partial config via `-backend-config`
- Change backend → `terraform init` (`-migrate-state` / `-reconfigure`)
- Locking automatic where supported; `-lock=false`, `-lock-timeout=30s`, `force-unlock ID`

## Common backends
| Backend | Locking |
|---|---|
| local | ✅ (system file locks) |
| s3 | ✅ `use_lockfile = true` (S3 native), DynamoDB (deprecated) |
| azurerm | ✅ blob lease |
| gcs | ✅ |
| consul | ✅ |
| pg, kubernetes | ✅ |
| http | optional |
| HCP Terraform (`cloud`) | ✅ built-in |

## Drift decision tree
```
Real infra changed outside Terraform
├── Keep the manual change?      → update config to match, then plan shows no changes
│                                  (or apply -refresh-only to accept into state first)
├── Revert to config?            → terraform apply
├── Attribute managed elsewhere? → lifecycle { ignore_changes = [attr] }
└── Object deleted?              → plan will recreate it
```

## Refactoring matrix
| Goal | Config (preferred) | CLI |
|---|---|---|
| Rename / move address | `moved {}` | `terraform state mv` |
| Stop managing (keep object) | `removed { lifecycle { destroy = false } }` | `terraform state rm` |
| Adopt existing object | `import {}` + `plan -generate-config-out` | `terraform import` |
| Force re-create | — | `apply -replace=ADDR` (was `taint`) |
| Sync state with reality | — | `apply -refresh-only` (was `refresh`) |

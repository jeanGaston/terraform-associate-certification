# Flashcards

Cover the right column and test yourself. Numbers help you track progress in the study plan.

| # | Question | Answer |
|---|---|---|
| 1 | Terraform style: declarative or imperative? | Declarative |
| 2 | Language Terraform config is written in | HCL (or JSON `*.tf.json`) |
| 3 | Self-hosted HCP Terraform | Terraform Enterprise |
| 4 | Component that calls platform APIs | Provider |
| 5 | Provider source default hostname | `registry.terraform.io` |
| 6 | Provider source format | `[hostname/]namespace/type` |
| 7 | `~> 1.2.0` allows | `>= 1.2.0, < 1.3.0` |
| 8 | `~> 1.2` allows | `>= 1.2, < 2.0` |
| 9 | File pinning provider versions + hashes | `.terraform.lock.hcl` (commit it) |
| 10 | Does lock file track modules? | No |
| 11 | Upgrade providers within constraints | `terraform init -upgrade` |
| 12 | Multiple configs of same provider | `alias` + `provider = aws.alias` |
| 13 | Pass aliased provider to module | `providers = { aws = aws.west }` |
| 14 | Provider tiers | Official, Partner, Community (+ Archived) |
| 15 | Where `init` puts providers | `.terraform/providers` |
| 16 | First command in a new dir | `terraform init` |
| 17 | `validate` contacts APIs? | No |
| 18 | `fmt` flag for CI | `-check` |
| 19 | Format subdirectories | `fmt -recursive` |
| 20 | `-/+` in plan | Destroy then create (replace) |
| 21 | `+/-` in plan | Create then destroy (create_before_destroy) |
| 22 | `<=` in plan | Read data source |
| 23 | Default parallelism | 10 |
| 24 | Apply saved plan prompts? | No |
| 25 | `destroy` equivalent | `apply -destroy` |
| 26 | Preview destroy | `plan -destroy` |
| 27 | Plan exit codes with `-detailed-exitcode` | 0 none, 1 error, 2 changes |
| 28 | Rollback on failed apply? | No; partial state saved |
| 29 | Data source reference | `data.TYPE.NAME.ATTR` |
| 30 | Module output reference | `module.NAME.OUTPUT` |
| 31 | Highest variable precedence | `-var` / `-var-file` on CLI |
| 32 | Lowest variable precedence | `default` |
| 33 | Env var for variable `region` | `TF_VAR_region` |
| 34 | Auto-loaded var files | `terraform.tfvars(.json)`, `*.auto.tfvars(.json)` |
| 35 | Missing required var & interactive | Prompt |
| 36 | Unordered unique collection | `set` |
| 37 | Fixed-attribute mixed-type structure | `object` |
| 38 | Fixed-length positional mixed types | `tuple` |
| 39 | Repeat nested blocks | `dynamic` block |
| 40 | `for_each` accepts | map or set of strings |
| 41 | Iterate & keep stable addresses | `for_each` |
| 42 | Conditional resource | `count = cond ? 1 : 0` |
| 43 | `count` + `for_each` together? | No |
| 44 | Hidden dependency | `depends_on` |
| 45 | Zero-downtime replacement | `create_before_destroy` |
| 46 | Block destroy in plan | `prevent_destroy` |
| 47 | Ignore drift on attribute | `ignore_changes` |
| 48 | Replace when another thing changes | `replace_triggered_by` |
| 49 | Custom condition that only warns | `check` block |
| 50 | Condition with `self` | `postcondition` |
| 51 | `sensitive = true` keeps value out of state? | No |
| 52 | Keep value out of state & plan | `ephemeral` / write-only args |
| 53 | Short-lived cloud creds from Vault | Dynamic secrets |
| 54 | User-defined functions in HCL? | No |
| 55 | Replacement for `null_resource` | `terraform_data` |
| 56 | Provisioner failure default | Fail → resource tainted |
| 57 | Module definition | Directory of `.tf` files |
| 58 | Local module path must start with | `./` or `../` |
| 59 | `version` arg works for | Registry modules only |
| 60 | Pin Git module | `?ref=v1.2.0` |
| 61 | Subdirectory in module source | `//subdir` |
| 62 | Registry module repo name | `terraform-<PROVIDER>-<NAME>` |
| 63 | Child sees parent vars? | No — pass as inputs |
| 64 | Download modules only | `terraform get` |
| 65 | Default backend | local |
| 66 | Default state file | `terraform.tfstate` |
| 67 | Previous state copy | `terraform.tfstate.backup` |
| 68 | Variables in backend block? | No; use `-backend-config` |
| 69 | Move state to new backend | `init -migrate-state` |
| 70 | Release stuck lock | `force-unlock LOCK_ID` |
| 71 | Read other state outputs | `terraform_remote_state` (root outputs only) |
| 72 | HCP alternative | `tfe_outputs` |
| 73 | Accept real-world changes into state | `apply -refresh-only` |
| 74 | Replacement for `taint` | `apply -replace=ADDR` |
| 75 | Rename without recreate | `moved` block |
| 76 | Forget resource, keep object | `removed` block / `state rm` |
| 77 | State field incremented each write | `serial` |
| 78 | Unique ID of state history | `lineage` |
| 79 | Is state encrypted locally? | No |
| 80 | CLI workspace state dir | `terraform.tfstate.d/` |
| 81 | Current workspace in HCL | `terraform.workspace` |
| 82 | Config-driven import | `import { to  id }` |
| 83 | Generate import config | `plan -generate-config-out=f.tf` |
| 84 | CLI import writes config? | No |
| 85 | Import changes | State only |
| 86 | Most verbose log level | TRACE |
| 87 | Log to file | `TF_LOG_PATH` (+ `TF_LOG`) |
| 88 | Provider-only logs | `TF_LOG_PROVIDER` |
| 89 | Panic output file | `crash.log` |
| 90 | List state resources | `terraform state list` |
| 91 | One resource's attributes | `terraform state show ADDR` |
| 92 | Store HCP API token | `terraform login` |
| 93 | HCP integration block | `cloud {}` in `terraform {}` |
| 94 | HCP ws vs CLI ws | HCP: state + vars + perms + runs; CLI: state only |
| 95 | Group HCP workspaces | Projects |
| 96 | Share vars across workspaces | Variable sets |
| 97 | PR in VCS workflow triggers | Speculative plan |
| 98 | Policy frameworks | Sentinel, OPA |
| 99 | When policies run | After plan, before apply |
| 100 | Non-overridable policy level | hard-mandatory |
| 101 | Overridable policy level | soft-mandatory |
| 102 | Reach private networks | HCP Terraform agents |
| 103 | Execution modes | Remote, Local, Agent |
| 104 | Periodic drift detection | Health assessments |
| 105 | Share private modules | Private registry |
| 106 | Secretless cloud auth in HCP | Dynamic provider credentials (OIDC) |

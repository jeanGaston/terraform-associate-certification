# Lesson 08 — HCP Terraform

**Objectives covered:** 8a–8d · **Time:** ~1.5 h

HCP Terraform (formerly **Terraform Cloud**) is HashiCorp's SaaS for running Terraform as a team.
**Terraform Enterprise** is the self-hosted distribution with the same core features.

## 1. Core concepts & hierarchy

```
Organization
 ├── Teams (permissions)
 ├── Projects  (group workspaces; permissions can be set per project)
 │    ├── Workspace: network-prod
 │    ├── Workspace: network-dev
 │    └── Workspace: app-prod
 ├── Private registry (modules & providers)
 ├── Policy sets (Sentinel / OPA)
 └── Variable sets (shared variables)
```

### Workspaces (HCP Terraform) vs CLI workspaces
| | HCP Terraform workspace | CLI workspace (`terraform workspace`) |
|---|---|---|
| What | A full unit: config source + **variables** + **state** + run history + permissions + settings | Just an alternate **state** for the same config/backend |
| Isolation | Separate credentials, variables, access | Same backend & credentials |
| Typical use | One per component per environment (`network-prod`) | Quick parallel copies of one config |

**Projects** group related workspaces (e.g. by team or app) and let you grant team access at the project level.

## 2. Workflows (how runs are triggered)

| Workflow | How it works |
|---|---|
| **VCS-driven** | Workspace linked to a Git repo branch. PRs trigger **speculative plans** (plan-only, can't apply); merges trigger plan + apply |
| **CLI-driven** | You run `terraform plan/apply` locally; execution happens **remotely** in HCP Terraform, output streamed back |
| **API-driven** | Your tooling uploads config versions and triggers runs via the API |

**Execution modes:** *Remote* (default: runs on HCP Terraform's workers), *Local* (HCP Terraform stores state only;
plans/applies run on your machine), *Agent* (runs on self-hosted **HCP Terraform agents** inside your network,
to reach private infrastructure).

## 3. Connecting the CLI — the `cloud` block

```bash
terraform login                  # opens browser, stores API token in ~/.terraform.d/credentials.tfrc.json
```

```hcl
terraform {
  cloud {
    organization = "my-org"
    # hostname = "app.terraform.io"        # default; set for Terraform Enterprise

    workspaces {
      name = "app-prod"                    # a single workspace
      # tags = ["app", "prod"]             # or: any workspace with these tags
      # project = "my-project"
    }
  }
}
```
Then `terraform init`. Existing local state can be **migrated** to HCP Terraform during init.
- You can't use both `cloud` and `backend` blocks.
- Env vars can supply these: `TF_CLOUD_ORGANIZATION`, `TF_WORKSPACE`, `TF_CLOUD_HOSTNAME`.
- The older `backend "remote"` still works but `cloud` is the preferred integration.

## 4. Runs

A run = plan (+ optional apply). Stages: *Pending → Plan → Cost estimation → Policy check → Apply*.

- **Speculative plans**: plan-only runs (from PRs or `terraform plan` in CLI-driven workflow); can't be applied.
- **Auto-apply** workspace setting vs manual **confirm & apply**.
- **Run triggers**: a successful apply in workspace A can queue a run in workspace B.
- **Run tasks**: integrate third-party tools (security scanners, cost tools) at pre-plan/post-plan/pre-apply.
- Runs in a workspace are **queued** — only one at a time, so locking is built-in. Workspaces can be locked manually.

## 5. Variables

- **Terraform variables** (set `var.x`) and **environment variables** (e.g. `AWS_ACCESS_KEY_ID`, `TF_LOG`).
- Can be marked **sensitive** → write-only: never displayed again in UI/API.
- **HCL** checkbox allows complex values.
- **Variable sets** share variables across many workspaces/projects (e.g. cloud credentials).
- Precedence (highest first): **priority** variable sets → workspace-specific variables →
  project-scoped variable sets → global variable sets.
- **Dynamic provider credentials**: OIDC-based short-lived credentials for AWS, Azure, GCP, Vault — no static secrets.

## 6. Collaboration & governance

| Feature | What |
|---|---|
| **Remote state** | Stored, encrypted, versioned, locked automatically; state history per workspace |
| **Teams & permissions** | Org / project / workspace permissions (read, plan, write, admin; custom) |
| **Private registry** | Share private modules and providers inside the org; supports no-code modules |
| **Policy as code** | **Sentinel** (HashiCorp's language) and **OPA** (Rego) policies enforced between plan and apply. Enforcement levels: *advisory* (warn), *soft-mandatory* (can be overridden by authorized users), *hard-mandatory* (cannot be overridden) |
| **Cost estimation** | Estimated monthly cost of changes for supported providers |
| **Health assessments** | Scheduled **drift detection** and **continuous validation** (checks `check` blocks & conditions) |
| **Audit trail** | Run history, who approved what |
| **SSO, audit logging, agents** | Higher tiers / Enterprise |
| **No-code provisioning** | Users create workspaces from approved no-code modules without writing HCL |
| **Explorer** | Org-wide view of workspaces, providers, modules, versions |
| **Ephemeral workspaces** | Auto-destroy after a set time/inactivity |

Sentinel/OPA policies are evaluated **after plan, before apply**.

## 7. Sharing data between workspaces

- `tfe_outputs` data source (tfe provider) — reads outputs of another workspace (preferred).
- `terraform_remote_state` with `backend = "remote"` — requires access to the whole state.
- Remote state sharing must be enabled for the consumer workspace (org-wide or selected workspaces).

## 8. Pricing tiers (high level)

Free tier is available (limited managed resources); paid tiers (Essentials/Standard/Premium) add features such as
policy enforcement at scale, run tasks, agents, SSO, and audit logging. Details change — check the pricing page.

## Key takeaways

- `terraform login` + `cloud { organization, workspaces {} }` + `terraform init`.
- HCP workspace = state **+ variables + permissions + runs**. CLI workspace = state only.
- Projects group workspaces. Variable sets share variables.
- Sentinel/OPA run between plan and apply. Hard-mandatory can't be overridden.
- VCS PRs → speculative plans.

## Review quiz

1. Which command stores an API token for HCP Terraform?
2. What block connects a configuration to HCP Terraform?
3. What's the difference between an HCP Terraform workspace and a CLI workspace?
4. When are Sentinel policies evaluated?
5. Which enforcement level can never be overridden?
6. What kind of run is triggered by a pull request in a VCS-connected workspace?
7. Which feature lets many workspaces share the same cloud credentials variables?
8. What lets HCP Terraform runs reach infrastructure in a private network?
9. What groups workspaces for easier permission management?
10. Which HCP Terraform feature periodically detects drift?

<details><summary>Answers</summary>

1. `terraform login`.
2. `terraform { cloud { ... } }`.
3. HCP workspace holds state, variables, permissions, settings and run history; a CLI workspace is only a separate state.
4. After plan, before apply.
5. Hard-mandatory.
6. A speculative plan (plan-only).
7. Variable sets.
8. HCP Terraform agents (agent execution mode).
9. Projects.
10. Health assessments (drift detection).
</details>

➡️ Lab: [lab/LAB.md](lab/LAB.md)

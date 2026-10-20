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

Pick the best answer for each question. Answers and explanations are at the bottom;
on the training website this quiz is interactive and scored.

**1.** Which command stores an API token for HCP Terraform?
- A. `terraform login`
- B. `terraform auth`
- C. `terraform init -token`
- D. `terraform cloud connect`

**2.** Which block connects a configuration to HCP Terraform?
- A. `backend "hcp" {}`
- B. `cloud {}` inside the `terraform` block
- C. `provider "tfe" {}`
- D. `hcp {}`

**3.** What does an HCP Terraform workspace hold that a CLI workspace does NOT? *(Select TWO)*
- A. State
- B. Variables
- C. Team access permissions
- D. A working directory

**4.** When are Sentinel or OPA policies evaluated in a run?
- A. Before the plan
- B. After the plan, before the apply
- C. After the apply
- D. Only on destroy runs

**5.** Which policy enforcement level can never be overridden?
- A. Advisory
- B. Soft-mandatory
- C. Hard-mandatory
- D. Mandatory-override

**6.** What kind of run does a pull request trigger in a VCS-connected workspace?
- A. An apply
- B. A speculative plan (plan-only)
- C. A destroy plan
- D. A refresh-only run

**7.** Which feature lets many workspaces share the same cloud credential variables?
- A. Variable sets
- B. Projects
- C. Run triggers
- D. The private registry

**8.** What lets HCP Terraform runs reach infrastructure in a private network?
- A. HCP Terraform agents (agent execution mode)
- B. Variable sets
- C. Sentinel policies
- D. Health assessments

**9.** What groups workspaces for easier permission management?
- A. Projects
- B. Variable sets
- C. Policy sets
- D. Run triggers

**10.** Which HCP Terraform feature periodically detects drift?
- A. Health assessments
- B. Run triggers
- C. Speculative plans
- D. Sentinel

<details><summary>Answers</summary>

| # | Ans | Explanation |
|---|---|---|
| 1 | A | The token is saved to `~/.terraform.d/credentials.tfrc.json`. |
| 2 | B | `terraform { cloud { organization = "..." workspaces { ... } } }`. The `tfe` provider *manages* HCP Terraform; it doesn't connect a configuration to it. |
| 3 | B, C | A CLI workspace is only a separate state. HCP workspaces also hold variables, permissions, settings and run history. |
| 4 | B | Policies check the plan, so a violation can stop the apply. |
| 5 | C | Advisory only warns, and soft-mandatory can be overridden by authorized users. |
| 6 | B | Speculative plans show the impact in the PR and can never be applied. Merging triggers the real run. |
| 7 | A | A variable set is applied to many workspaces or projects at once. |
| 8 | A | Agents run inside your network and poll HCP Terraform for work, so no inbound access is needed. |
| 9 | A | Teams can be granted access to a whole project instead of workspace by workspace. |
| 10 | A | Health assessments run refresh-only checks on a schedule and report drift and failing `check` blocks. |
</details>

➡️ Lab: [lab/LAB.md](lab/LAB.md)

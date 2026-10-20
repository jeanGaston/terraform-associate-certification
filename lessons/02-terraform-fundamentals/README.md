# Lesson 02 — Terraform Fundamentals: Providers & State Basics

**Objectives covered:** 2a, 2b, 2c, 2d · **Time:** ~1.5 h

## 1. Installing Terraform

Terraform is a single Go binary. Install options: package managers (`brew`, `apt`/`yum` via the HashiCorp repo,
`choco`), manual zip download, or version managers such as `tfenv`/`tfswitch`.

```bash
terraform version        # shows core version + provider versions in the current dir
terraform -help          # list commands
terraform -install-autocomplete
```

## 2. The `terraform` settings block

```hcl
terraform {
  required_version = ">= 1.12.0, < 2.0.0"   # constrains the Terraform CLI version

  required_providers {
    aws = {
      source  = "hashicorp/aws"           # <HOSTNAME>/<NAMESPACE>/<TYPE>
      version = "~> 6.0"                    # constrains the provider version
    }
    random = {
      source  = "hashicorp/random"
      version = ">= 3.6.0"
    }
  }

  backend "s3" { ... }     # optional: where state is stored (Lesson 06)
  # cloud { ... }          # optional: HCP Terraform integration (Lesson 08)
}
```

- Only **constants** are allowed inside the `terraform` block (no variables, no functions).
- **Source address:** `[<HOSTNAME>/]<NAMESPACE>/<TYPE>`. Hostname defaults to `registry.terraform.io`.
  So `hashicorp/aws` == `registry.terraform.io/hashicorp/aws`.
- If you omit `required_providers`, Terraform infers `hashicorp/<name>` from the resource prefix —
  works for official providers only; always declare explicitly.

### Version constraint operators (very testable!)

| Operator | Meaning | Example `~> 1.2.0` / `~> 1.2` |
|---|---|---|
| `=` (or none) | exactly this version | `= 1.2.0` |
| `!=` | exclude a version | `!= 1.2.3` |
| `>`, `>=`, `<`, `<=` | comparisons | `>= 1.2.0, < 2.0.0` |
| `~>` | **pessimistic**: only the *rightmost* component may increase | `~> 1.2.0` → `>= 1.2.0, < 1.3.0`<br>`~> 1.2` → `>= 1.2, < 2.0` |

## 3. Providers — how Terraform uses them

- Providers are **plugins**, separate binaries, released on their own schedule, independent of Terraform core.
- Terraform Core talks to providers over **RPC (gRPC)**.
- Each provider defines **resource types** and **data sources** (e.g. `aws_instance`, `data.aws_ami`).
- `terraform init` **downloads** required providers into `.terraform/providers/` in the working directory.
- Provider tiers on the Registry:
  - **Official** — owned & maintained by HashiCorp (`hashicorp/` namespace)
  - **Partner** — maintained by a technology partner, verified by HashiCorp
  - **Community** — published by individuals/organizations
  - (Archived — no longer maintained)

### Provider configuration

```hcl
provider "aws" {
  region = "eu-west-1"
  # credentials: use env vars / shared config / IAM roles — never hard-code secrets
}
```

A provider block is optional if the provider needs no configuration (e.g. `random`, `local`).

### Multiple configurations of the same provider — `alias`

```hcl
provider "aws" {             # default configuration (no alias)
  region = "us-east-1"
}

provider "aws" {
  alias  = "west"
  region = "us-west-2"
}

resource "aws_s3_bucket" "logs" {
  provider = aws.west        # <PROVIDER>.<ALIAS>
  bucket   = "my-logs-west"
}
```

Resources without a `provider` argument use the **default** (un-aliased) configuration.
Passing aliased providers into modules uses the `providers = { aws = aws.west }` argument (Lesson 05).

### Multiple *different* providers in one configuration

Totally normal — e.g. `aws` + `cloudflare` + `random` in the same root module, with
cross-provider references (`cloudflare_record.value = aws_instance.web.public_ip`).

## 4. The dependency lock file: `.terraform.lock.hcl`

- Created/updated by `terraform init`.
- Records the **exact provider versions** selected and their **checksums (hashes)**.
- **Commit it to version control** so everyone (and CI) uses the same provider versions.
- Only tracks **providers**, **not modules**.
- On subsequent `init`, Terraform reuses the locked versions even if newer ones satisfy constraints.
- To move to newer allowed versions: `terraform init -upgrade`.
- To add hashes for other OSes: `terraform providers lock -platform=linux_amd64 -platform=darwin_arm64`.

## 5. Plugin cache & provider installation

- Default: providers downloaded per working directory into `.terraform/`.
- Optional shared cache: `plugin_cache_dir` in the CLI config file (`~/.terraformrc`) or env var
  `TF_PLUGIN_CACHE_DIR`.
- Air-gapped: `provider_installation` block with `filesystem_mirror` / `network_mirror`, or
  `terraform providers mirror <dir>`.

## 6. How Terraform uses state (intro — deep dive in Lesson 06)

State (`terraform.tfstate`, JSON) is Terraform's **source of truth about what it manages**:

1. **Mapping** config resources → real-world object IDs.
2. **Metadata**, e.g. dependencies, so Terraform can destroy in the right order even after resources were removed from config.
3. **Performance** — caches attribute values; for big infra you can use `-refresh=false`.
4. **Syncing** — shared remote state lets teams collaborate.

Facts to memorize:
- Default: **local backend**, file `terraform.tfstate` in the working directory; previous version kept in `terraform.tfstate.backup`.
- State can contain **secrets in plain text** → protect it, never commit it to Git.
- Terraform **refreshes** state (reads real infrastructure) during `plan` and `apply` by default.
- Don't edit state by hand; use `terraform state` subcommands.

## Key takeaways

- `terraform { required_providers {...} }` + `.terraform.lock.hcl` = reproducible provider versions.
- `~> 1.2.0` allows patch updates only; `~> 1.2` allows minor updates.
- `alias` = multiple configurations of the same provider.
- State maps config to real resources; stored locally by default.

## Review quiz

Pick the best answer for each question. Answers and explanations are at the bottom;
on the training website this quiz is interactive and scored.

**1.** A provider constraint is `~> 5.4.0`. Which versions does it allow?
- A. `>= 5.4.0, < 6.0.0`
- B. `>= 5.4.0, < 5.5.0`
- C. Exactly `5.4.0`
- D. `>= 5.4.0` with no upper bound

**2.** Which file records the exact provider versions and checksums and should be committed to Git?
- A. `terraform.tfstate`
- B. `.terraform.lock.hcl`
- C. `.terraform/`
- D. `terraform.tfvars`

**3.** Which command upgrades providers to the newest versions allowed by your constraints?
- A. `terraform get -update`
- B. `terraform init -upgrade`
- C. `terraform providers upgrade`
- D. `terraform apply -upgrade`

**4.** How do you make a resource use a non-default provider configuration?
- A. Declare the provider with `alias = "west"`, then set `provider = aws.west` on the resource
- B. Set `region = "west"` directly on the resource
- C. Declare a second `terraform {}` block
- D. Add `depends_on = [provider.aws.west]` to the resource

**5.** Does the dependency lock file track module versions?
- A. Yes
- B. No

**6.** What is the default source hostname for providers?
- A. `github.com`
- B. `registry.terraform.io`
- C. `releases.hashicorp.com`
- D. `app.terraform.io`

**7.** Which are provider tiers in the Terraform Registry? *(Select THREE)*
- A. Official
- B. Partner
- C. Community
- D. Enterprise
- E. Certified

<details><summary>Answers</summary>

| # | Ans | Explanation |
|---|---|---|
| 1 | B | `~>` lets only the right-most specified component increase. `~> 5.4.0` means `>= 5.4.0, < 5.5.0`, while `~> 5.4` means `>= 5.4, < 6.0`. |
| 2 | B | The dependency lock file. `.terraform/` is a local cache and should be gitignored. |
| 3 | B | `init -upgrade` ignores the locked versions and picks the newest allowed ones, then rewrites the lock file. `get -update` only updates modules. |
| 4 | A | Aliased provider configurations are selected with the `provider` meta-argument (or the `providers` map for modules). |
| 5 | B | It tracks providers only. Pin modules with a `version` constraint (registry) or `?ref=` (Git). |
| 6 | B | `hashicorp/aws` is shorthand for `registry.terraform.io/hashicorp/aws`. |
| 7 | A, B, C | Official (HashiCorp), Partner (technology partners) and Community (individuals). Deprecated providers are marked Archived. |
</details>

➡️ Lab: [lab/LAB.md](lab/LAB.md)

# Lesson 05 — Terraform Modules

**Objectives covered:** 5a–5d · **Time:** ~1.5 h

## 1. What is a module?

A module is **a set of `.tf` files in a single directory**. That's it.

- **Root module** — the directory where you run `terraform`. Every configuration has one.
- **Child module** — a module called by another module via a `module` block.
- **Published modules** — shared via the public Terraform Registry or a private registry.

Why: reuse, encapsulation, consistency, standardization of best practices, less copy-paste.

## 2. Calling a module

```hcl
module "web_bucket" {
  source  = "terraform-aws-modules/s3-bucket/aws"   # registry: <NAMESPACE>/<NAME>/<PROVIDER>
  version = "~> 4.0"                                # only for registry modules

  bucket = "my-web-bucket"                          # input variables of the module

  # meta-arguments also work on modules
  count      = 1              # or for_each
  depends_on = [aws_iam_role.x]
  providers  = { aws = aws.west }
}

output "bucket_arn" {
  value = module.web_bucket.s3_bucket_arn           # module.<NAME>.<OUTPUT>
}
```

After adding or changing a module block's source/version you must run `terraform init` (or `terraform get`).
Modules are downloaded to `.terraform/modules/`.

## 3. Module sources

| Source | Example |
|---|---|
| Local path (must start with `./` or `../`) | `source = "./modules/network"` |
| Terraform Registry (public) | `source = "hashicorp/consul/aws"` |
| Private registry (HCP Terraform) | `source = "app.terraform.io/my-org/vpc/aws"` |
| GitHub | `source = "github.com/org/repo//modules/vpc?ref=v1.2.0"` |
| Generic Git | `source = "git::https://example.com/vpc.git?ref=v1.2.0"` |
| Bitbucket, Mercurial (`hg::`) | `source = "bitbucket.org/org/repo"` |
| HTTP URL (archive) | `source = "https://example.com/vpc-module.zip"` |
| S3 / GCS buckets | `source = "s3::https://s3-eu-west-1.amazonaws.com/bucket/vpc.zip"` |

Notes:
- `//` separates the repo from a **subdirectory**; `?ref=` selects a Git branch/tag/commit.
- Local path modules are **not downloaded/copied** — referenced directly, and they share the repo's version.
- The `version` argument **only works for registry sources** (public or private). For Git, pin with `?ref=`.

## 4. Public registry module requirements (for publishing)

- Hosted on **GitHub** (public repo), named `terraform-<PROVIDER>-<NAME>` (e.g. `terraform-aws-vpc`).
- Standard module structure: `README.md`, `main.tf`, `variables.tf`, `outputs.tf`, (`examples/`, `modules/`).
- Versions published from **semantic version tags** (`v1.0.0` or `1.0.0`).
- Registry modules can be marked verified/partner.

## 5. Variable scope — inputs and outputs are the only interface

- A child module **cannot** see the parent's variables, locals, or resources. Everything must be passed in as
  **input variables**.
- The parent **cannot** read a child's resources directly — only what the child exposes as **outputs**
  (`module.name.output_name`).
- Locals are private to the module that defines them.
- Providers: child modules **inherit** the default (un-aliased) provider configurations from the parent.
  Aliased configs must be passed explicitly with `providers = { ... }`. Modules should declare
  `required_providers` but generally **should not** contain `provider` blocks.

```
root module                        child module ./modules/app
─────────────                      ──────────────────────────
var.env ───── env = var.env ─────▶ variable "env" {}
                                   resource "x" "y" { ... }
module.app.url ◀──────────────── output "url" { value = x.y.url }
```

## 6. Module versioning

- Always pin registry modules: `version = "~> 4.0"` or exact `"4.1.2"`.
- `terraform init` installs the newest version matching the constraint *if nothing installed*;
  `terraform init -upgrade` checks for newer matching versions.
- Module versions are **not recorded in `.terraform.lock.hcl`** (providers only) — so pinning in code matters.
- For Git sources use tags: `?ref=v1.2.0` (or a commit SHA for immutability).

## 7. Module best practices

- Keep modules small and focused; avoid thin wrappers around a single resource.
- Expose useful outputs; document variables with `description` and `type`.
- Standard structure: `main.tf`, `variables.tf`, `outputs.tf`, `versions.tf`, `README.md`.
- Nested modules go in `modules/`; examples in `examples/`.
- Use `moved` blocks when refactoring resources into modules (Lesson 06).

## Key takeaways

- Module = a directory of `.tf` files; root module is where you run Terraform.
- Communication: **inputs in, outputs out**. No implicit access to parent scope.
- `version` only for registry modules; Git uses `?ref=`.
- Run `terraform init` after adding/changing modules.

## Review quiz

1. What's the minimum requirement for something to be a Terraform module?
2. How does a parent read a value from a child module named `network`?
3. Can a child module read the parent's `var.region` automatically?
4. You pin a GitHub module source with `version = "1.2.0"`. Does it work?
5. Which command must you run after adding a new module block?
6. Registry source format?
7. Naming format for a public registry module repo?
8. Are module versions tracked in `.terraform.lock.hcl`?

<details><summary>Answers</summary>

1. A directory containing `.tf` files.
2. Via an output: `module.network.<output_name>`.
3. No — it must be passed as an input variable.
4. No — `version` is only for registry sources; use `?ref=v1.2.0`.
5. `terraform init` (or `terraform get`).
6. `<NAMESPACE>/<NAME>/<PROVIDER>` (with optional hostname prefix for private registries).
7. `terraform-<PROVIDER>-<NAME>`.
8. No.
</details>

➡️ Lab: [lab/LAB.md](lab/LAB.md)

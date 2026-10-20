# Lesson 04 — Terraform Configuration (HCL Deep Dive)

**Objectives covered:** 4a–4h · **Time:** ~4 h (the largest exam domain — take it in 3 sittings)

---

## Part 1 — Blocks, resources, data sources, references

### 1.1 HCL syntax

```hcl
<BLOCK TYPE> "<LABEL>" "<LABEL>" {
  <IDENTIFIER> = <EXPRESSION>   # argument
  nested_block { ... }
}
```

- Comments: `#` or `//` single line, `/* */` multi-line. `#` is the idiomatic one.
- Files: `*.tf` (HCL) or `*.tf.json`. All `.tf` files in a directory form **one module** — file names don't matter
  (convention: `main.tf`, `variables.tf`, `outputs.tf`, `providers.tf`, `versions.tf`, `terraform.tf`).
- `*_override.tf` / `override.tf` files merge into and override other definitions (rarely used).

### 1.2 Resource blocks — things Terraform **manages** (create/update/delete)

```hcl
resource "aws_instance" "web" {          # type "aws_instance", local name "web"
  ami           = "ami-123456"
  instance_type = "t3.micro"
}
```
- Address: `aws_instance.web`. Type + name must be unique within a module.
- Type prefix (`aws_`) tells Terraform which provider to use.

### 1.3 Data sources — things Terraform **reads** (never manages)

```hcl
data "aws_ami" "ubuntu" {
  most_recent = true
  owners      = ["099720109477"]
  filter {
    name   = "name"
    values = ["ubuntu/images/hvm-ssd/ubuntu-*-24.04-amd64-server-*"]
  }
}

resource "aws_instance" "web" {
  ami = data.aws_ami.ubuntu.id          # data.<TYPE>.<NAME>.<ATTRIBUTE>
}
```
- Use for: looking up IDs, existing resources created elsewhere, remote state (`terraform_remote_state`),
  computed documents (`aws_iam_policy_document`), etc.
- Read during **plan** when possible (`<=` in plan), or deferred to apply if they depend on unknown values.

### 1.4 References (cross-resource)

| Syntax | Refers to |
|---|---|
| `<TYPE>.<NAME>.<ATTR>` | managed resource attribute |
| `data.<TYPE>.<NAME>.<ATTR>` | data source attribute |
| `var.<NAME>` | input variable |
| `local.<NAME>` | local value |
| `module.<NAME>.<OUTPUT>` | child module output |
| `path.module`, `path.root`, `path.cwd` | filesystem paths |
| `terraform.workspace` | current workspace name |
| `count.index`, `each.key`, `each.value`, `self` | context-specific |

- **Arguments** are what you set; **attributes** include those plus values *computed* by the provider
  after creation (e.g. `id`, `arn`, `public_ip`). Unknown-until-apply values show as `(known after apply)`.
- Referencing another resource creates an **implicit dependency**.

---

## Part 2 — Variables, outputs, locals

### 2.1 Input variables

```hcl
variable "instance_type" {
  description = "EC2 instance type"
  type        = string
  default     = "t3.micro"      # no default => required
  sensitive   = false
  nullable    = false
  ephemeral   = false           # 1.10+: value is not persisted to state/plan

  validation {
    condition     = contains(["t3.micro", "t3.small"], var.instance_type)
    error_message = "Only t3.micro or t3.small are allowed."
  }
}
```

**Variable precedence — lowest to highest (LATER WINS):**

1. `default` in the variable block
2. Environment variables `TF_VAR_<name>` (e.g. `export TF_VAR_instance_type=t3.small`)
3. `terraform.tfvars`
4. `terraform.tfvars.json`
5. `*.auto.tfvars` / `*.auto.tfvars.json` (lexical order of filenames)
6. `-var` and `-var-file` on the command line (in the order given — last one wins)

If a required variable has no value from any source, Terraform **prompts** interactively
(or errors with `-input=false`).

Only `terraform.tfvars` and `*.auto.tfvars` are loaded **automatically**; other `.tfvars` files need `-var-file`.

### 2.2 Output values

```hcl
output "instance_ip" {
  description = "Public IP"
  value       = aws_instance.web.public_ip
  sensitive   = true            # redacted in CLI output, but STILL stored in state in plain text
  depends_on  = [aws_eip.web]   # rarely needed
}
```
- Outputs of the **root module** are printed after apply and via `terraform output`.
- Outputs of a **child module** are how a module exposes values to its parent (`module.x.instance_ip`).
- `terraform output -raw name` → raw string, handy in scripts; `-json` shows sensitive values.

### 2.3 Local values

```hcl
locals {
  name_prefix = "${var.project}-${var.env}"
  common_tags = { Project = var.project, Env = var.env }
}
# use: local.name_prefix   (note: block is `locals`, reference is `local.`)
```
Use locals to avoid repetition; they're scoped to the module and can't be set from outside.

---

## Part 3 — Types and complex types

| Kind | Types |
|---|---|
| Primitive | `string`, `number`, `bool` |
| Collection (same element type) | `list(T)`, `set(T)`, `map(T)` |
| Structural (mixed types) | `object({ attr = T, ... })`, `tuple([T1, T2, ...])` |
| Special | `any` (let Terraform infer), `null` (absence of value) |

```hcl
variable "subnets" {
  type = list(object({
    name = string
    cidr = string
    public = optional(bool, false)   # optional attribute with default
  }))
}

variable "tags" {
  type = map(string)
}
```

- `list` — ordered, indexed `var.l[0]`, duplicates allowed.
- `set` — unordered, unique, **no index access** (convert with `tolist()`).
- `map` — string keys → values of one type, `var.m["key"]` or `var.m.key`.
- `object` — fixed attribute names, each with its own type.
- `tuple` — fixed length, each position its own type.
- Terraform performs **automatic type conversion** where possible (`"5"` ↔ `5`, `"true"` ↔ `true`).

---

## Part 4 — Expressions and functions

### 4.1 Expressions

```hcl
# String interpolation & directives
"Hello, ${var.name}!"
"%{ if var.env == "prod" }PRODUCTION%{ else }non-prod%{ endif }"

# Heredoc
<<-EOT
  indented heredoc, leading whitespace trimmed
EOT

# Conditional (ternary)
instance_type = var.env == "prod" ? "m5.large" : "t3.micro"

# for expressions
[for s in var.names : upper(s)]                          # → list
{for s in var.names : s => length(s)}                    # → map
[for s in var.names : s if s != "admin"]                 # filter
{for k, v in var.tags : k => v if v != ""}

# Splat
aws_instance.web[*].id          # == [for i in aws_instance.web : i.id]

# Operators: + - * / %  == !=  < > <= >=  && || !
```

### 4.2 `dynamic` blocks — generate repeated **nested blocks**

```hcl
resource "aws_security_group" "web" {
  name = "web"

  dynamic "ingress" {
    for_each = var.ingress_ports          # list or map
    content {
      from_port   = ingress.value         # iterator is named after the block ("ingress")
      to_port     = ingress.value
      protocol    = "tcp"
      cidr_blocks = ["0.0.0.0/0"]
    }
  }
}
```
Use `iterator = port` to rename the iterator variable. Don't overuse — hurts readability.

### 4.3 Built-in functions (you **cannot** define your own functions in HCL; provider-defined functions exist via `provider::<name>::<fn>`)

| Category | Examples |
|---|---|
| String | `upper`, `lower`, `format`, `join`, `split`, `replace`, `trimspace`, `substr`, `regex` |
| Numeric | `min`, `max`, `abs`, `ceil`, `floor` |
| Collection | `length`, `element`, `lookup`, `merge`, `concat`, `flatten`, `keys`, `values`, `contains`, `distinct`, `toset`, `tolist`, `tomap`, `zipmap`, `slice`, `coalesce` |
| Encoding | `jsonencode`, `jsondecode`, `yamlencode`, `base64encode` |
| Filesystem | `file`, `fileexists`, `templatefile`, `filebase64` |
| Date/time | `timestamp`, `formatdate`, `timeadd` |
| Hash/crypto | `md5`, `sha256`, `uuid` |
| IP network | `cidrsubnet`, `cidrhost` |
| Type conversion | `tostring`, `tonumber`, `try`, `can` |

Test them in `terraform console`:
```
> cidrsubnet("10.0.0.0/16", 8, 2)
"10.0.2.0/24"
> lookup({a = 1}, "b", 0)
0
> element(["a","b","c"], 4)
"b"                 # wraps around
```

---

## Part 5 — Meta-arguments & dependencies

Meta-arguments work on (almost) any resource/module: `count`, `for_each`, `depends_on`, `provider`, `lifecycle`
(and `providers` for modules).

### 5.1 `count`
```hcl
resource "aws_instance" "web" {
  count = 3
  tags  = { Name = "web-${count.index}" }
}
# addresses: aws_instance.web[0], [1], [2]; all: aws_instance.web[*].id
```
Conditional creation: `count = var.create ? 1 : 0`.
Downside: removing an element from the middle **shifts indexes**, causing unwanted replacements.

### 5.2 `for_each` (map or set of strings)
```hcl
resource "aws_iam_user" "u" {
  for_each = toset(["alice", "bob"])
  name     = each.key                 # for sets, each.key == each.value
}
# addresses: aws_iam_user.u["alice"], aws_iam_user.u["bob"]
```
Stable addresses by key → preferred when instances aren't identical. Can't use `count` and `for_each` together.
Keys must be known at plan time.

### 5.3 Dependencies
- **Implicit** — created automatically by references. Preferred.
- **Explicit** — `depends_on = [aws_iam_role_policy.x]`, only when there's a hidden dependency Terraform
  can't see (e.g. an app needs an IAM policy attached before it starts, but doesn't reference it).
- Terraform builds a **dependency graph** and creates independent resources **in parallel**.

### 5.4 `lifecycle`
```hcl
lifecycle {
  create_before_destroy = true            # new created before old destroyed
  prevent_destroy       = true            # plan errors if resource would be destroyed
  ignore_changes        = [tags]          # ignore drift/changes on these attrs (or `all`)
  replace_triggered_by  = [aws_ecs_task_definition.app.id]
  precondition  { ... }
  postcondition { ... }
}
```
Note: `prevent_destroy` doesn't stop you deleting the block from config and applying.

### 5.5 `terraform_data` (replaces `null_resource`) and provisioners
- `terraform_data` — built-in resource for storing values / triggering replacements (`triggers_replace`).
- **Provisioners** (`local-exec`, `remote-exec`, `file`) are a **last resort**. Prefer cloud-init/`user_data`,
  images built with Packer, or config management tools.
  - Creation-time by default; `when = destroy` for destroy-time.
  - `on_failure = continue | fail` (default `fail` → resource is **tainted**).

---

## Part 6 — Custom conditions (validation)

| Mechanism | Where | Evaluated | Effect on failure |
|---|---|---|---|
| `validation` block | `variable` | when the variable is evaluated | error, blocks run |
| `precondition` | `lifecycle` of resource / data / output | **before** the object is evaluated | error, blocks run |
| `postcondition` | `lifecycle` of resource / data | **after** apply/read | error, blocks dependents |
| `check` block | top-level | end of plan & apply | **warning only**, doesn't block |

```hcl
resource "aws_instance" "web" {
  lifecycle {
    precondition {
      condition     = data.aws_ami.ubuntu.architecture == "x86_64"
      error_message = "AMI must be x86_64."
    }
    postcondition {
      condition     = self.public_dns != ""      # `self` only in postconditions
      error_message = "Instance must have a public DNS name."
    }
  }
}

check "health" {
  data "http" "site" { url = "https://example.com" }     # scoped data source
  assert {
    condition     = data.http.site.status_code == 200
    error_message = "Site is not healthy."
  }
}
```

---

## Part 7 — Sensitive data & secrets (Vault)

- `sensitive = true` on variables/outputs **redacts CLI output** only. Values are **still in state and
  plan files in plain text**.
- `ephemeral = true` variables/outputs and **ephemeral resources** (`ephemeral "..." "..." {}`, Terraform 1.10+)
  are **never written to state or plan**. **Write-only arguments** (`*_wo`, 1.11+) let you pass secrets to a
  provider without persisting them.
- Protect state: remote backend with **encryption at rest** + strict **access control**; never commit
  `*.tfstate` or secret `*.tfvars` to Git.
- Never hard-code credentials in `.tf` files. Use env vars, IAM roles / workload identity, or a secrets manager.
- **HashiCorp Vault** integration:
  - `vault` provider → read secrets with data sources (e.g. `data "vault_kv_secret_v2"`) or, better,
    ephemeral resources, at run time.
  - **Dynamic secrets**: Vault generates short-lived cloud credentials (e.g. AWS keys with a TTL) for each
    Terraform run, reducing blast radius.
  - HCP Terraform supports **dynamic provider credentials** (OIDC workload identity) with AWS/Azure/GCP/Vault —
    no static credentials stored at all.
- In HCP Terraform, mark workspace variables as **sensitive** (write-only in the UI/API).

---

## Key takeaways

- `resource` manages, `data` reads.
- Variable precedence: default < env < tfvars < tfvars.json < auto.tfvars < CLI.
- `for_each` > `count` for non-identical instances. `dynamic` for nested blocks.
- Implicit dependencies via references; `depends_on` only for hidden ones.
- `validation` / `pre` / `postcondition` block runs; `check` only warns.
- `sensitive` ≠ encrypted: it's still in state.

## Review quiz

Pick the best answer for each question. Answers and explanations are at the bottom;
on the training website this quiz is interactive and scored.

**1.** How do you reference the `id` of the data source `aws_vpc.main`?
- A. `aws_vpc.main.id`
- B. `data.aws_vpc.main.id`
- C. `data.main.id`
- D. `var.aws_vpc.main.id`

**2.** A variable is set by its `default`, `TF_VAR_`, `terraform.tfvars` and `-var`. Which value wins?
- A. `default`
- B. The `TF_VAR_` environment variable
- C. `terraform.tfvars`
- D. `-var` on the command line

**3.** Which statement describes a `set`?
- A. Ordered, allows duplicates, accessed by index
- B. Unordered, unique values, no index access
- C. A collection of values keyed by strings
- D. A fixed-length sequence where each position has its own type

**4.** You need 3 users named alice, bob and carol, with addresses that stay stable if one is removed. Which meta-argument?
- A. `count = 3`
- B. `for_each = toset(["alice", "bob", "carol"])`
- C. A `dynamic` block
- D. `depends_on`

**5.** When should you use `depends_on`?
- A. On every resource, to control ordering
- B. Only for hidden dependencies Terraform can't infer from references
- C. To make resources run in parallel
- D. To read outputs from a module

**6.** What does `lifecycle { create_before_destroy = true }` do?
- A. Creates the replacement before destroying the old object
- B. Prevents the resource from ever being destroyed
- C. Ignores changes made outside Terraform
- D. Destroys the old object first, then creates the new one

**7.** Which custom condition only produces a warning, never an error?
- A. `precondition`
- B. `postcondition`
- C. A `check` block
- D. A variable `validation` block

**8.** True or False: `sensitive = true` keeps a value out of the state file.
- A. True
- B. False

**9.** In `dynamic "setting" { ... }`, what is the iterator called by default?
- A. `each`
- B. `setting`
- C. `iterator`
- D. `item`

**10.** True or False: you can write your own functions in HCL.
- A. True
- B. False

<details><summary>Answers</summary>

| # | Ans | Explanation |
|---|---|---|
| 1 | B | Data sources are always prefixed with `data.`: `data.TYPE.NAME.ATTRIBUTE`. |
| 2 | D | Precedence, lowest to highest: default, environment, `terraform.tfvars`, `*.auto.tfvars`, then `-var`/`-var-file` on the CLI. |
| 3 | B | That's a set. Ordered with duplicates is a `list`, string-keyed is a `map`, fixed-length positional is a `tuple`. |
| 4 | B | `for_each` keys instances by value (`aws_iam_user.u["bob"]`). With `count`, removing bob would shift carol's index and force a replacement. |
| 5 | B | References already create implicit dependencies. `depends_on` is a last resort for dependencies that aren't visible in the configuration. |
| 6 | A | It flips the default replacement order to avoid downtime. `prevent_destroy` blocks destruction; `ignore_changes` ignores drift. |
| 7 | C | `check` block assertions report warnings. Preconditions, postconditions and validations stop the run. |
| 8 | B | It only redacts the value in CLI output. Use ephemeral values or write-only arguments to avoid persisting secrets. |
| 9 | B | The iterator takes the block's label (`setting.key`, `setting.value`) unless renamed with the `iterator` argument. `each` belongs to `for_each`. |
| 10 | B | Only built-in functions are available, plus functions provided by providers. |
</details>

➡️ Lab: [lab/LAB.md](lab/LAB.md)

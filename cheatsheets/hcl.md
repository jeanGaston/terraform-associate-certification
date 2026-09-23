# HCL Language Cheatsheet

## Block types
```hcl
terraform { required_version = "..."  required_providers {...}  backend "x" {...} | cloud {...} }
provider "aws" { region = "..."  alias = "west" }
resource "TYPE" "NAME" { ... }          # TYPE.NAME
data "TYPE" "NAME" { ... }              # data.TYPE.NAME
variable "NAME" { type default description sensitive nullable ephemeral validation {} }
output "NAME" { value description sensitive ephemeral depends_on precondition {} }
locals { k = v }                        # local.k
module "NAME" { source version providers count for_each depends_on }
moved { from = ...  to = ... }
removed { from = ...  lifecycle { destroy = false } }
import { to = ...  id = "..." }
check "NAME" { data "..." "..." {}  assert { condition  error_message } }
ephemeral "TYPE" "NAME" { ... }         # ephemeral.TYPE.NAME, never persisted
```

## Types
`string` `number` `bool` · `list(T)` `set(T)` `map(T)` · `object({...})` `tuple([...])` · `any` · `null`
`optional(T, default)` inside `object`.

## Variable precedence (last wins)
default → `TF_VAR_x` → `terraform.tfvars` → `terraform.tfvars.json` → `*.auto.tfvars(.json)` → `-var` / `-var-file`

## Expressions
```hcl
"${var.a}-${local.b}"                                    # interpolation
"%{ if cond }yes%{ else }no%{ endif }"                   # directive
cond ? a : b                                             # conditional
[for x in list : f(x) if cond]                           # list comprehension
{for k, v in map : k => v}                               # map comprehension
{for x in list : x.group => x...}                        # grouping (ellipsis)
resource.name[*].attr                                    # splat
<<-EOT ... EOT                                            # heredoc (indented)
```

## Meta-arguments
| Arg | On | Note |
|---|---|---|
| `count` | resource, module, data | `count.index`; `[*]` splat |
| `for_each` | resource, module, data | map or set(string); `each.key`, `each.value` |
| `depends_on` | resource, module, data, output | hidden deps only |
| `provider` | resource, data | `aws.west` |
| `providers` | module | `{ aws = aws.west }` |
| `lifecycle` | resource | `create_before_destroy`, `prevent_destroy`, `ignore_changes`, `replace_triggered_by`, `precondition`, `postcondition` |

## dynamic block
```hcl
dynamic "ingress" {
  for_each = var.ports
  iterator = port          # optional; default = block name
  content {
    from_port = port.value
    to_port   = port.value
  }
}
```

## Custom conditions
| | Blocks run? | `self`? |
|---|---|---|
| variable `validation` | yes | no (use `var.x`) |
| `precondition` | yes | no |
| `postcondition` | yes | **yes** |
| `check` `assert` | **no, warning** | no |

## Handy functions
```
length  merge  concat  flatten  keys  values  lookup(m,k,default)  contains  distinct
element(list, i)  slice  zipmap  toset  tolist  tomap  coalesce  one
join(sep, list)  split(sep, s)  upper  lower  format  replace  trimspace  regex  startswith  strcontains
file  templatefile(path, vars)  fileexists  jsonencode  jsondecode  yamlencode  base64encode
cidrsubnet("10.0.0.0/16", 8, 1) → "10.0.1.0/24"   cidrhost
min  max  ceil  floor  abs
try(expr, fallback)  can(expr)
timestamp  formatdate  uuid  sha256  md5
```

## Named values
`var.` `local.` `module.X.` `data.` `path.module` `path.root` `path.cwd` `terraform.workspace` `count.index` `each.key` `each.value` `self`

## Provisioners (last resort)
```hcl
provisioner "local-exec"  { command = "echo ${self.id}" }
provisioner "remote-exec" { inline = ["sudo apt update"] }   # needs connection {}
provisioner "file"        { source = "a" destination = "/tmp/a" }
# when = destroy     on_failure = continue | fail (default → tainted)
```

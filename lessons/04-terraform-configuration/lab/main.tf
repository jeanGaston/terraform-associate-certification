locals {
  name_prefix = "${var.project}-${var.environment}"

  common_tags = merge(
    {
      project     = var.project
      environment = var.environment
      managed_by  = "terraform"
    },
    var.tags,
  )

  # for expression producing a map, with a filter
  multi_replica_servers = { for name, s in var.servers : name => s.replicas if s.replicas > 1 }

  # conditional expression
  log_level = var.environment == "prod" ? "warn" : "debug"
}

# Suffix to make names unique. Changing `keepers` forces a new ID.
resource "random_id" "suffix" {
  byte_length = 3
  keepers = {
    project = var.project
  }
}

# for_each over a map: one file per server, stable addresses like local_file.server["web"]
resource "local_file" "server" {
  for_each = var.servers

  filename = "${path.module}/output/${local.name_prefix}-${each.key}.conf"
  content = templatefile("${path.module}/templates/server.conf.tftpl", {
    name      = "${local.name_prefix}-${each.key}-${random_id.suffix.hex}" # implicit dependency on random_id
    size      = each.value.size
    replicas  = each.value.replicas
    ports     = each.value.ports
    log_level = local.log_level
    tags      = local.common_tags
  })

  lifecycle {
    create_before_destroy = true

    precondition {
      condition     = contains(["small", "medium", "large"], each.value.size)
      error_message = "Server ${each.key}: size must be small, medium or large."
    }
  }
}

# count over a list: local_file.admin[0], local_file.admin[1] ...
resource "local_file" "admin" {
  count = length(var.admins)

  filename = "${path.module}/output/admins/${count.index}-${var.admins[count.index]}.txt"
  content  = "admin=${var.admins[count.index]}\n"
}

# Conditional creation with count = condition ? 1 : 0
resource "local_file" "prod_banner" {
  count = var.environment == "prod" ? 1 : 0

  filename = "${path.module}/output/PRODUCTION"
  content  = "Careful: this is production.\n"
}

# Sensitive value written to a file: local_sensitive_file hides content in plan output.
resource "local_sensitive_file" "db_credentials" {
  filename = "${path.module}/output/db.env"
  content  = "DB_PASSWORD=${var.db_password}\n"
}

# Explicit dependency: nothing references the admin files, but we want this to run after them.
resource "terraform_data" "inventory" {
  input = {
    servers = keys(local_file.server)
    admins  = local_file.admin[*].filename # splat expression
  }

  triggers_replace = [random_id.suffix.hex]

  depends_on = [local_file.admin]
}

# Data source: read back a file we created (data sources read, never manage)
data "local_file" "web_conf" {
  filename = local_file.server["web"].filename

  lifecycle {
    postcondition {
      condition     = strcontains(self.content, "size")
      error_message = "Rendered config is missing the size setting."
    }
  }
}

# check block: produces a WARNING, never blocks the run
check "password_strength" {
  assert {
    condition     = length(var.db_password) >= 16
    error_message = "db_password is shorter than 16 characters. Consider a stronger secret."
  }
}

variable "project" {
  description = "Project name, used as a prefix"
  type        = string
  default     = "acme"

  validation {
    condition     = can(regex("^[a-z][a-z0-9-]{2,15}$", var.project))
    error_message = "project must be 3-16 chars, lowercase letters, digits or dashes, starting with a letter."
  }
}

variable "environment" {
  description = "Deployment environment"
  type        = string
  default     = "dev"

  validation {
    condition     = contains(["dev", "stage", "prod"], var.environment)
    error_message = "environment must be one of: dev, stage, prod."
  }
}

# Complex type: map of objects with an optional attribute + default
variable "servers" {
  description = "Servers to 'provision' (rendered as config files)"
  type = map(object({
    size     = string
    replicas = optional(number, 1)
    ports    = optional(list(number), [80])
  }))
  default = {
    web = { size = "small", ports = [80, 443] }
    api = { size = "medium", replicas = 2, ports = [8080] }
  }
}

variable "admins" {
  description = "Admin usernames (demonstrates count)"
  type        = list(string)
  default     = ["alice", "bob"]
}

variable "tags" {
  description = "Extra tags merged into the common tags"
  type        = map(string)
  default     = {}
}

variable "db_password" {
  description = "Demo secret. Set with TF_VAR_db_password. Redacted in output but STILL stored in state."
  type        = string
  sensitive   = true
  default     = "changeme"
}

terraform {
  required_version = ">= 1.12.0"

  # Modules declare required providers but do NOT configure them (no provider blocks).
  required_providers {
    local = {
      source  = "hashicorp/local"
      version = ">= 2.5"
    }
    random = {
      source  = "hashicorp/random"
      version = ">= 3.6"
    }
  }
}

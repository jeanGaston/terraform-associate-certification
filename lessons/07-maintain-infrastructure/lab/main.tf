terraform {
  required_version = ">= 1.12.0"

  required_providers {
    random = {
      source  = "hashicorp/random"
      version = "~> 3.6"
    }
    local = {
      source  = "hashicorp/local"
      version = "~> 2.5"
    }
  }
}

# The random provider supports import, which lets us practice without a cloud account.
# Pretend "LegacyToken42" is a value that already exists and must be adopted, not regenerated.

# ---- Exercise 1: config-driven import -------------------------------------
# Uncomment this block, then run:
#   terraform plan -generate-config-out=generated.tf
#
# import {
#   to = random_string.legacy_token
#   id = "LegacyToken42"
# }

# ---- Exercise 2: CLI import ---------------------------------------------------
# The resource block must exist BEFORE running `terraform import`.
resource "random_id" "session" {
  byte_length = 4
}

resource "local_file" "report" {
  filename = "${path.module}/output/report.txt"
  content  = "session=${random_id.session.hex}\n"
}

output "session_hex" {
  value = random_id.session.hex
}

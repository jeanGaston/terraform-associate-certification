terraform {
  required_version = ">= 1.12.0"

  # Replace YOUR-ORG with your HCP Terraform organization name, then run `terraform init`.
  # Commented out so the repo validation script works without an HCP account.
  #
  # cloud {
  #   organization = "YOUR-ORG"
  #
  #   workspaces {
  #     name    = "tf-associate-lab"
  #     project = "Default Project"
  #   }
  # }

  required_providers {
    random = {
      source  = "hashicorp/random"
      version = "~> 3.6"
    }
  }
}

variable "team" {
  description = "Set this as a Terraform variable in the HCP Terraform workspace"
  type        = string
  default     = "platform"
}

variable "api_key" {
  description = "Set this as a SENSITIVE Terraform variable in the workspace"
  type        = string
  sensitive   = true
  default     = "not-set"
}

resource "random_pet" "name" {
  prefix = var.team
  length = 2
}

# Runs remotely: note there's no local file here. Remote runs can't write to your laptop.
resource "terraform_data" "deployment" {
  input = {
    name        = random_pet.name.id
    workspace   = terraform.workspace
    api_key_set = var.api_key != "not-set"
  }
}

output "deployment_name" {
  value = random_pet.name.id
}

output "api_key_configured" {
  value = terraform_data.deployment.output.api_key_set
}

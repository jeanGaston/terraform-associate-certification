terraform {
  required_version = ">= 1.12.0"

  required_providers {
    local = {
      source  = "hashicorp/local"
      version = "~> 2.5"
    }
    random = {
      source  = "hashicorp/random"
      version = "~> 3.6"
    }
  }

  # Exercise 1: uncomment, then run `terraform init -migrate-state`
  # backend "local" {
  #   path = "state/terraform.tfstate"
  # }
}

resource "random_pet" "app" {
  length = 2
}

resource "local_file" "config" {
  filename = "${path.module}/output/app.conf"
  content  = "app_name=${random_pet.app.id}\nworkspace=${terraform.workspace}\n"
}

resource "local_file" "legacy" {
  filename = "${path.module}/output/legacy.txt"
  content  = "I will be 'forgotten' by Terraform but not deleted.\n"
}

output "app_name" {
  value = random_pet.app.id
}

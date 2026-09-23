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

# Two different providers used together, with a cross-provider reference:
# the random provider generates a name, the local provider writes it to disk.
resource "random_pet" "primary" {
  length    = 2
  separator = "-"
}

resource "local_file" "server_name" {
  filename = "${path.module}/output/server-name.txt"
  content  = "server: ${random_pet.primary.id}\n"
}

output "primary_name" {
  value = random_pet.primary.id
}

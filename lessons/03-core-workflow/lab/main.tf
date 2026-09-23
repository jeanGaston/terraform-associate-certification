# This file is INTENTIONALLY badly formatted. Run `terraform fmt` to fix it.
terraform {
required_providers {
random = {
source = "hashicorp/random"
version = "~> 3.6"
}
local = {
    source = "hashicorp/local"
      version = "~> 2.5"
}
}
}

variable "pet_length" {
type = number
    default = 2
}

resource "random_pet" "this" {
length = var.pet_length
}

resource "local_file" "pet" {
  filename    = "${path.module}/output/pet.txt"
    content = "My pet is ${random_pet.this.id}\n"
}

output "pet_name" {
value = random_pet.this.id
}

# Syntax practice for provider aliases.
# In real life this is typically:
#   provider "aws" { region = "us-east-1" }
#   provider "aws" { alias = "west"  region = "us-west-2" }
# The random provider has no arguments, but the alias mechanics are identical.

provider "random" {
  # default (un-aliased) configuration
}

provider "random" {
  alias = "secondary"
}

resource "random_pet" "secondary" {
  provider = random.secondary # <PROVIDER NAME>.<ALIAS>
  length   = 3
}

output "secondary_name" {
  value = random_pet.secondary.id
}

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
}

variable "environment" {
  type    = string
  default = "dev"
}

# 1) A single module call with a local path source
module "docs_site" {
  source = "./modules/static-site"

  site_name   = "docs"
  base_dir    = "${path.root}/output"
  environment = var.environment # passed explicitly: modules can't see the parent's variables
  pages = {
    "index.html"   = "Documentation"
    "install.html" = "Installation"
  }
}

# 2) The same module instantiated many times with for_each
locals {
  marketing_sites = {
    blog  = { "index.html" = "Blog", "about.html" = "About us" }
    store = { "index.html" = "Store" }
  }
}

module "marketing" {
  source   = "./modules/static-site"
  for_each = local.marketing_sites

  site_name   = each.key
  base_dir    = "${path.root}/output"
  pages       = each.value
  environment = var.environment
}

# 3) Registry module example (commented out - needs a cloud account):
# module "vpc" {
#   source  = "terraform-aws-modules/vpc/aws"
#   version = "~> 6.0"
#   name    = "demo"
#   cidr    = "10.0.0.0/16"
# }

output "docs_pages" {
  value = module.docs_site.page_paths
}

output "marketing_dirs" {
  value = { for name, m in module.marketing : name => m.site_dir }
}

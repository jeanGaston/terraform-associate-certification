variable "site_name" {
  description = "Name of the site; used as the folder name"
  type        = string
}

variable "base_dir" {
  description = "Directory where the site is rendered"
  type        = string
}

variable "pages" {
  description = "Map of page file name => page title"
  type        = map(string)
  default = {
    "index.html" = "Home"
  }
}

variable "environment" {
  description = "Environment label shown in the footer"
  type        = string
  default     = "dev"
}

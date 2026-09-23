terraform {
  required_version = ">= 1.12.0"

  required_providers {
    local = {
      source  = "hashicorp/local"
      version = "~> 2.5"
    }
  }
}

variable "greeting" {
  description = "Text written to the file"
  type        = string
  default     = "Hello, Infrastructure as Code!"
}

resource "local_file" "hello" {
  filename = "${path.module}/output/hello.txt"
  content  = "${var.greeting}\n"
}

output "file_path" {
  value = local_file.hello.filename
}

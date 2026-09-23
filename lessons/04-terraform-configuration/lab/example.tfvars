# Copy to terraform.tfvars (auto-loaded) or pass with -var-file=example.tfvars
project     = "shop"
environment = "stage"

servers = {
  web    = { size = "small", ports = [80, 443] }
  api    = { size = "large", replicas = 3, ports = [8080, 8443] }
  worker = { size = "medium" }
}

admins = ["alice", "bob", "carol"]

tags = {
  owner = "platform-team"
}

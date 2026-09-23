output "server_files" {
  description = "Map of server name => rendered file path"
  value       = { for name, f in local_file.server : name => f.filename }
}

output "admin_files" {
  description = "Admin files, via splat"
  value       = local_file.admin[*].filename
}

output "multi_replica_servers" {
  value = local.multi_replica_servers
}

output "web_conf_preview" {
  description = "First line of the web config, read through a data source"
  value       = split("\n", data.local_file.web_conf.content)[0]
}

output "db_password" {
  description = "Redacted in CLI output; visible with `terraform output -raw db_password` and in state!"
  value       = var.db_password
  sensitive   = true
}

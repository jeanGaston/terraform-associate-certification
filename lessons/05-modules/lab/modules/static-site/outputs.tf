output "site_dir" {
  description = "Directory the site was rendered to"
  value       = local.site_dir
}

output "page_paths" {
  description = "Paths of all rendered pages"
  value       = [for p in local_file.page : p.filename]
}

output "build_id" {
  description = "Random build identifier"
  value       = random_id.build.hex
}

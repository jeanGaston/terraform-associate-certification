locals {
  # Private to this module: the root module cannot read local.site_dir.
  site_dir = "${var.base_dir}/${var.site_name}"
}

resource "random_id" "build" {
  byte_length = 4
}

resource "local_file" "page" {
  for_each = var.pages

  filename = "${local.site_dir}/${each.key}"
  content  = <<-HTML
    <!doctype html>
    <html>
      <head><title>${each.value} | ${var.site_name}</title></head>
      <body>
        <h1>${each.value}</h1>
        <footer>env=${var.environment} build=${random_id.build.hex}</footer>
      </body>
    </html>
  HTML
}

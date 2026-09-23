# static-site module

Renders a tiny static website to the local filesystem.

## Inputs

| Name | Type | Default | Description |
|---|---|---|---|
| `site_name` | `string` | — (required) | Folder name for the site |
| `base_dir` | `string` | — (required) | Where to render |
| `pages` | `map(string)` | `{ "index.html" = "Home" }` | file name => title |
| `environment` | `string` | `"dev"` | Footer label |

## Outputs

| Name | Description |
|---|---|
| `site_dir` | Rendered directory |
| `page_paths` | List of page files |
| `build_id` | Random build id |

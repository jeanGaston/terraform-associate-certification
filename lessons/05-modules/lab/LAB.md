# Lab 05 — Build and consume a module

```bash
cd lessons/05-modules/lab
terraform init        # note "Initializing modules..."
cat .terraform/modules/modules.json
terraform apply
terraform state list
```

Addresses look like `module.docs_site.local_file.page["index.html"]` and
`module.marketing["blog"].random_id.build`.

## Exercises

1. **Scope:** In the root `main.tf`, add `output "x" { value = module.docs_site.local.site_dir }`
   and run `terraform validate`. Why does it fail? Fix it by using the `site_dir` output instead.
2. **Inputs:** Remove the `environment = var.environment` line from `module "docs_site"` and plan.
   The module falls back to its own default (`dev`) — it does *not* see the root variable.
   Run `terraform plan -var environment=prod` to see which sites change. Restore the line.
3. **New module call:** Add a `module "status_page"` block and run `terraform plan` *before* `init`.
   What error do you get? Run `terraform init` (or `terraform get`) and plan again.
4. **Add a page to one marketing site** by editing `local.marketing_sites`. Only that instance changes.
5. **Refactor with `moved`:** rename `module "docs_site"` to `module "documentation"`. Plan: everything
   is destroyed/recreated. Now add:
   ```hcl
   moved {
     from = module.docs_site
     to   = module.documentation
   }
   ```
   Plan again → no destroy, just moves. (More in Lesson 06.)
6. **Bonus (needs internet):** convert the module into a Git repo, tag `v1.0.0`, and call it with
   `source = "git::file:///ABSOLUTE/PATH/static-site?ref=v1.0.0"`.

## Clean up
```bash
terraform destroy
```

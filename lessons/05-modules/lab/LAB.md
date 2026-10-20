# Lab 05 — Build and consume a module

> **Checkpoints:** answer the `question` blocks and run the `check` blocks as you go. On the training website
> they are interactive, and the lab counts as done when every checkpoint passes.

```bash
cd lessons/05-modules/lab
terraform init        # note "Initializing modules..."
cat .terraform/modules/modules.json
terraform apply
terraform state list
```

Addresses look like `module.docs_site.local_file.page["index.html"]` and
`module.marketing["blog"].random_id.build`.

```check
id: applied
title: Apply the root module and its module calls
run: terraform state list | grep -qxF 'module.marketing["blog"].random_id.build' && terraform state list | grep -q '^module\.docs_site\.'
hint: Run `terraform init`, then `terraform apply` and answer `yes`.
```

## Exercises

1. **Scope:** In the root `main.tf`, add `output "x" { value = module.docs_site.local.site_dir }`
   and run `terraform validate`. Why does it fail? Fix it by using the `site_dir` output instead.

```question
Q: Why does `module.docs_site.local.site_dir` fail validation?
- A. Locals must be referenced as `local.site_dir` everywhere
- B. A module only exposes its outputs; its locals, variables and resources are private
- C. `site_dir` is misspelled
- D. Outputs can't reference modules
answer: B
explain: Read child values through declared outputs: `module.docs_site.site_dir`.
```

2. **Inputs:** Remove the `environment = var.environment` line from `module "docs_site"` and plan.
   Then run `terraform plan -var environment=prod` to see which sites change. Restore the line.

```question
Q: Without `environment = var.environment` in the module block, which value does `docs_site` use?
- A. The root's `var.environment`, inherited automatically
- B. The module's own default for `environment` (`dev`)
- C. None: the plan fails
- D. The value from the `marketing` module
answer: B
explain: Modules can't see the parent's variables. With `-var environment=prod`, only the `marketing` sites change because `docs_site` no longer receives it.
```

3. **New module call:** Add a `module "status_page"` block and run `terraform plan` *before* `init`.
   What error do you get? Run `terraform init` (or `terraform get`) and plan again.

```question
Q: What happens when you plan right after adding a new `module` block?
- A. Terraform downloads the module automatically
- B. A `Module not installed` error asking you to run `terraform init`
- C. The new module is ignored
- D. The plan succeeds with no changes
answer: B
explain: Modules are installed into `.terraform/modules` by `init` (or `get`), never during plan.
```

4. **Add a page to one marketing site** by editing `local.marketing_sites`. Only that instance changes.
5. **Refactor with `moved`:** rename `module "docs_site"` to `module "documentation"` (also update the
   `docs_pages` output). Run `terraform init`, because the module is installed under its new name, then plan
   and look at what happens to the docs site. Now add:
   ```hcl
   moved {
     from = module.docs_site
     to   = module.documentation
   }
   ```
   Plan again → no destroy, just moves. Apply it. (More in Lesson 06.)

```question
Q: You rename `module "docs_site"` to `module "documentation"` without a `moved` block. What does the plan do?
- A. Renames the addresses automatically
- B. Destroys everything under `module.docs_site` and creates it again under `module.documentation`
- C. Fails with a duplicate module error
- D. Nothing changes
answer: B
explain: The address is the identity. Without `moved`, Terraform sees one module removed and another added.
```

```check
id: moved
title: Apply the rename with a moved block
run: terraform state list | grep -q '^module\.documentation\.' && ! terraform state list | grep -q '^module\.docs_site\.'
hint: Rename the module, add the `moved` block, then run `terraform apply`.
```

6. **Bonus (needs internet):** convert the module into a Git repo, tag `v1.0.0`, and call it with
   `source = "git::file:///ABSOLUTE/PATH/static-site?ref=v1.0.0"`.

## Clean up
```bash
terraform destroy
```

```check
id: destroyed
title: Destroy everything
run: grep -q '"resources": \[\]' terraform.tfstate
hint: Run `terraform destroy` and answer `yes`.
```

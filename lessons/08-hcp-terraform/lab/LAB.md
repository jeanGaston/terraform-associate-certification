# Lab 08 — HCP Terraform (free tier)

**Needs:** a free HCP Terraform account → <https://app.terraform.io/signup/account>.
Everything uses the `random` provider and built-in `terraform_data`, so no cloud credentials are required.

## Exercise 1 — CLI-driven workflow
1. Create an organization in the UI (or use an existing one).
2. Log in from the CLI:
   ```bash
   terraform login        # token saved to ~/.terraform.d/credentials.tfrc.json
   ```
3. In `main.tf`, uncomment the `cloud` block and set your organization.
4. Initialize — the workspace is created automatically if it doesn't exist:
   ```bash
   cd lessons/08-hcp-terraform/lab
   terraform init
   ```
5. `terraform plan` → notice the link to the run in HCP Terraform: the plan runs **remotely**.
6. `terraform apply`. Open the workspace in the UI: check **Runs**, **States** (state versions), and outputs.

## Exercise 2 — Variables & variable sets
1. In the workspace → **Variables**, add a Terraform variable `team = data` and a **sensitive** Terraform variable
   `api_key = s3cr3t`. Notice you can't read the sensitive value back.
2. `terraform apply` → `deployment_name` starts with `data-`, `api_key_configured = true`.
3. Create an organization **variable set** with an env var `TF_LOG = INFO` and apply it to the workspace.
   Run a plan and look at the more verbose run log.

## Exercise 3 — Migrating local state
1. Comment the `cloud` block, `rm -rf .terraform`, `terraform init`, `terraform apply` (local state).
2. Uncomment the `cloud` block (use a new workspace name) and `terraform init` → accept the prompt to
   **migrate the local state** to HCP Terraform.

## Exercise 4 — VCS-driven workflow (optional)
1. Push this lab folder to a GitHub repo.
2. Create a new workspace → *Version control workflow* → select the repo, set the working directory.
3. Open a pull request that changes `length = 3` → a **speculative plan** appears as a PR check.
4. Merge → a run is queued; confirm & apply in the UI (or enable **auto-apply** in settings).

## Exercise 5 — Explore governance features (read the UI)
- Organization settings → **Teams**, **Projects**, **Policies/Policy sets**, **Variable sets**, **Agents**.
- Workspace settings → **Execution mode** (Remote/Local/Agent), **Auto-apply**, **Remote state sharing**,
  **Health** (drift detection, where available), **Locking**, **Destruction and deletion**.
- **Registry** → publish the lesson-05 module privately (requires a VCS repo named `terraform-local-static-site`
  with a semver tag).

## Clean up
```bash
terraform destroy
```
Then delete the workspace: Settings → *Destruction and Deletion*.

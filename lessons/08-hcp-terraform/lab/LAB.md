# Lab 08 — HCP Terraform (free tier)

**Needs:** a free HCP Terraform account → <https://app.terraform.io/signup/account>.
Everything uses the `random` provider and built-in `terraform_data`, so no cloud credentials are required.

> **Checkpoints:** answer the `question` blocks and run the `check` blocks as you go. On the training website
> they are interactive, and the lab counts as done when every checkpoint passes. The checks in this lab can
> also be confirmed by hand, because they depend on your HCP Terraform account.

## Exercise 1 — CLI-driven workflow
1. Create an organization in the UI (or use an existing one).
2. Log in from the CLI:
   ```bash
   terraform login        # token saved to ~/.terraform.d/credentials.tfrc.json
   ```

```check
id: login
title: Log in to HCP Terraform
run: test -s "$HOME/.terraform.d/credentials.tfrc.json"
manual: allowed
hint: Run `terraform login`, answer `yes`, create a token in the browser and paste it.
```

3. In `main.tf`, uncomment the `cloud` block and set your organization.
4. Initialize — the workspace is created automatically if it doesn't exist:
   ```bash
   cd lessons/08-hcp-terraform/lab
   terraform init
   ```
5. `terraform plan` → notice the link to the run in HCP Terraform. Where does the plan run?
6. `terraform apply`. Open the workspace in the UI: check **Runs**, **States** (state versions), and outputs.

```check
id: cloud-connected
title: Connect the configuration to HCP Terraform
run: grep -Eq '^[[:space:]]*cloud \{' main.tf && grep -Eq '^[[:space:]]*organization[[:space:]]*=' main.tf && ! grep -Eq '^[[:space:]]*organization[[:space:]]*=[[:space:]]*"YOUR-ORG"' main.tf && test -f .terraform/terraform.tfstate
manual: allowed
hint: Uncomment the `cloud` block, replace `YOUR-ORG` with your organization, then run `terraform init`.
```

```question
Q: With the `cloud` block configured, where does `terraform plan` run?
- A. On your machine, with state stored locally
- B. Remotely in HCP Terraform; your CLI streams the output and links to the run
- C. In your VCS provider
- D. Nowhere: CLI runs are disabled once a workspace exists
answer: B
explain: The default execution mode is Remote: the run happens in HCP Terraform, which also stores the state versions.
```

## Exercise 2 — Variables & variable sets
1. In the workspace → **Variables**, add a Terraform variable `team = data` and a **sensitive** Terraform variable
   `api_key = s3cr3t`. Try to read the sensitive value back in the UI.
2. `terraform apply` → `deployment_name` starts with `data-`, `api_key_configured = true`.
3. Create an organization **variable set** with an env var `TF_LOG = INFO` and apply it to the workspace.
   Run a plan and look at the more verbose run log.

```question
Q: After saving `api_key` as a sensitive workspace variable, what can you see in the UI?
- A. The value, after clicking "reveal"
- B. Nothing: sensitive variables are write-only and can only be replaced
- C. A hash of the value
- D. The first 4 characters
answer: B
explain: Sensitive variables can be used by runs but never read back through the UI or API.
```

```question
Q: Which feature applies the same variables (like `TF_LOG`) to many workspaces at once?
- A. Projects
- B. Variable sets
- C. Run triggers
- D. Policy sets
answer: B
explain: Variable sets are defined once at organization level and attached to workspaces or projects.
```

## Exercise 3 — Migrating local state
1. Comment the `cloud` block, `rm -rf .terraform`, `terraform init`, `terraform apply` (local state).
2. Uncomment the `cloud` block (use a new workspace name) and `terraform init` → accept the prompt to
   **migrate the local state** to HCP Terraform.

## Exercise 4 — VCS-driven workflow (optional)
1. Push this lab folder to a GitHub repo.
2. Create a new workspace → *Version control workflow* → select the repo, set the working directory.
3. Open a pull request that changes `length = 3`. What appears on the PR?
4. Merge → a run is queued; confirm & apply in the UI (or enable **auto-apply** in settings).

```question
Q: In a VCS-connected workspace, what does opening a pull request trigger?
- A. A full apply
- B. A speculative plan, shown as a check on the PR, which can never be applied
- C. A destroy plan
- D. Nothing until the PR is merged
answer: B
explain: Speculative plans preview the change for reviewers. Merging to the tracked branch queues the real run.
```

## Exercise 5 — Explore governance features (read the UI)
- Organization settings → **Teams**, **Projects**, **Policies/Policy sets**, **Variable sets**, **Agents**.
- Workspace settings → **Execution mode** (Remote/Local/Agent), **Auto-apply**, **Remote state sharing**,
  **Health** (drift detection, where available), **Locking**, **Destruction and deletion**.
- **Registry** → publish the lesson-05 module privately (requires a VCS repo named `terraform-local-static-site`
  with a semver tag).

```question
Q: Which execution mode runs plans and applies on infrastructure inside your own network?
- A. Remote
- B. Local
- C. Agent
- D. Speculative
answer: C
explain: Agent mode sends runs to HCP Terraform agents you host. Local mode runs on your machine and uses HCP Terraform only for state.
```

## Clean up
```bash
terraform destroy
```
Then delete the workspace: Settings → *Destruction and Deletion*.

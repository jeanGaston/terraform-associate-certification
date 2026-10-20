# Lab 01 — Your first declarative configuration

**Goal:** feel the difference between declarative and imperative, and see idempotency.

> **Checkpoints:** answer the `question` blocks and run the `check` blocks as you go. On the training website
> they are interactive: questions are scored, and checks inspect your lab sandbox through the lab server.
> The lab counts as done when every checkpoint passes.

## Steps

```bash
cd lessons/01-iac-concepts/lab
terraform init
terraform apply        # type "yes"
cat output/hello.txt
```

```check
id: first-apply
title: Apply the configuration
run: terraform state list | grep -qx 'local_file.hello' && test -f output/hello.txt
hint: Run `terraform init`, then `terraform apply` and answer `yes`.
```

1. Run `terraform apply` **again**, without changing anything. Read the output carefully.

```question
Q: You run `terraform apply` a second time without changing anything. What does Terraform do?
- A. Re-creates `output/hello.txt`
- B. Reports `No changes` because reality already matches the configuration
- C. Fails because the file already exists
- D. Appends the greeting to the file again
answer: B
explain: Declarative tools compare desired state with current state. Nothing differs, so nothing happens: that's **idempotency**.
```

2. Change `var.greeting` default in `main.tf` to something else and run `terraform plan`.
   Look at the symbol and the wording next to `local_file.hello`.

```check
id: greeting-changed
title: Change the greeting in main.tf
run: grep -q 'default' main.tf && ! grep -q '"Hello, Infrastructure as Code!"' main.tf
hint: Edit the `default` of `variable "greeting"` in `main.tf` (use the Files tab), then save.
```

```question
Q: After changing the greeting, what does `terraform plan` show for `local_file.hello`?
- A. `~ update in-place`
- B. `-/+ must be replaced`
- C. `No changes`
- D. An error: variables can't change after the first apply
answer: B
explain: Changing `content` of a `local_file` forces a new resource, so Terraform destroys and re-creates the file (immutable pattern).
```

3. Delete `output/hello.txt` manually, then `terraform plan`. What does Terraform propose?

```question
Q: You deleted `output/hello.txt` by hand. What does `terraform plan` propose?
- A. Nothing, because the state says the file exists
- B. `local_file.hello will be created`, because the refresh found the file missing
- C. Removing `local_file.hello` from state
- D. An error about a corrupted state
answer: B
explain: Plan refreshes state against reality first. The file is gone (**drift**), so Terraform plans to create it again.
```

4. Compare with `imperative.sh`: run it twice. It blindly repeats its steps; it has no concept of
   current vs. desired state.

```check
id: imperative-twice
title: Run imperative.sh twice
run: test "$(grep -c 'Hello, imperative world!' output/imperative.txt)" -ge 2
hint: Run `bash imperative.sh` two times.
```

```question
Q: After running `imperative.sh` twice, what is in `output/imperative.txt`?
- A. The line once: the script knows it already ran
- B. The line twice: the script repeats its steps without checking current state
- C. Nothing: the second run empties the file
- D. An error message
answer: B
explain: Imperative scripts execute steps, not desired state. Running them twice does the work twice.
```

5. Clean up:
   ```bash
   terraform destroy
   ```

```check
id: destroyed
title: Destroy everything
run: grep -q '"resources": \[\]' terraform.tfstate
hint: Run `terraform destroy` and answer `yes`.
```

## What you learned

- Declarative config + state = idempotent, drift-aware changes.
- Some changes force replacement.

# Lab 03 — init, fmt, validate, plan, apply, destroy

> **Checkpoints:** answer the `question` blocks and run the `check` blocks as you go. On the training website
> they are interactive, and the lab counts as done when every checkpoint passes.

```bash
cd lessons/03-core-workflow/lab
```

## 1. fmt
`main.tf` is intentionally badly formatted.
```bash
terraform fmt -check ; echo "exit code: $?"   # before formatting
terraform fmt -diff
terraform fmt -check ; echo "exit code: $?"   # after formatting
```

```question
Q: What exit code does `terraform fmt -check` give *before* you format `main.tf`?
- A. 0
- B. 3 (non-zero: files need formatting)
- C. 2
- D. 127
answer: B
explain: `-check` exits non-zero (3) when any file needs formatting, without changing files. That's what makes CI fail. After `fmt` it returns 0.
```

```check
id: formatted
title: Format main.tf
run: terraform fmt -check
hint: Run `terraform fmt` (or `terraform fmt -diff`) in the lab directory.
```

## 2. validate before init
```bash
terraform validate      # what happens before init?
terraform init
terraform validate
```
Now break something: change `length = var.pet_length` to `length = var.does_not_exist` and validate again.
Undo the change.

```question
Q: Why does `terraform validate` fail before `terraform init`?
- A. The configuration has a syntax error
- B. The required providers aren't installed yet
- C. `validate` needs cloud credentials
- D. There is no state file yet
answer: B
explain: `validate` needs the provider schemas, which `init` downloads. It never needs credentials or state.
```

```question
Q: What does `terraform validate` report after you reference `var.does_not_exist`?
- A. Success: undeclared variables are created automatically
- B. A `Reference to undeclared input variable` error
- C. A warning only
- D. It prompts you for a value
answer: B
explain: `validate` checks that every reference points to something declared. Don't forget to undo the change.
```

## 3. plan
```bash
terraform plan
terraform plan -out=tfplan
terraform show tfplan
terraform plan -detailed-exitcode ; echo "exit code: $?"
```

```check
id: saved-plan
title: Save a plan to a file
run: test -f tfplan
hint: Run `terraform plan -out=tfplan`.
```

```question
Q: Before the first apply, what exit code does `terraform plan -detailed-exitcode` return?
- A. 0, because the plan succeeded
- B. 1
- C. 2, because the plan succeeded and contains changes
- D. 3
answer: C
explain: With `-detailed-exitcode`: 0 = no changes, 1 = error, 2 = changes pending. Scripts use it to detect drift.
```

## 4. apply
```bash
terraform apply tfplan          # no prompt — saved plan
terraform plan -detailed-exitcode ; echo "exit code: $?"
terraform apply -var 'pet_length=4'   # interactive; notice the replacement (-/+)
terraform output
terraform output -raw pet_name
```

```check
id: pet-length-4
title: Apply with pet_length=4
run: test "$(terraform output -raw pet_name | awk -F- '{print NF}')" -eq 4
hint: Run `terraform apply -var 'pet_length=4'` and answer `yes`. Check right away; the next steps change the name again.
```

```question
Q: Why is `random_pet.this` replaced (`-/+`) when you apply with `-var 'pet_length=4'`?
- A. Every variable change replaces every resource
- B. `length` can't be updated in place on `random_pet`, so a new pet must be generated
- C. Because the plan wasn't saved first
- D. Because `local_file.pet` depends on it
answer: B
explain: Some arguments force replacement. `local_file.pet` is replaced too, because its content depends on the new name.
```

## 5. replace & target
```bash
terraform apply -replace='random_pet.this'     # force replacement of one resource
terraform plan -target='local_file.pet'        # note the warning about -target
```

```question
Q: What does Terraform warn about when you plan with `-target`?
- A. Nothing: `-target` is the recommended everyday workflow
- B. The plan may be incomplete, so `-target` is for exceptional situations only
- C. Targeted resources will be destroyed
- D. `-target` requires a saved plan
answer: B
explain: Targeting skips parts of the graph, so the result may not match your full configuration. Use it to recover from mistakes, not routinely.
```

## 6. console & graph
```bash
terraform console
> random_pet.this.id
> upper(random_pet.this.id)
> length(split("-", random_pet.this.id))
> exit
terraform graph   # paste into https://dreampuf.github.io/GraphvizOnline to visualize
```

```question
Q: In the console, what does `length(split("-", random_pet.this.id))` return?
- A. The number of characters in the pet name
- B. The number of words in the pet name, which equals the `length` used to create it
- C. Always 1
- D. An error: functions can't be used in the console
answer: B
explain: `split` turns `"happy-blue-cat"` into a list of words, and `length` counts them. The console evaluates any expression against the current state.
```

## 7. destroy
```bash
terraform plan -destroy
terraform destroy
```

```check
id: destroyed
title: Destroy everything
run: grep -q '"resources": \[\]' terraform.tfstate
hint: Run `terraform destroy` and answer `yes`.
```

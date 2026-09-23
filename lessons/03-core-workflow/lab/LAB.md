# Lab 03 — init, fmt, validate, plan, apply, destroy

```bash
cd lessons/03-core-workflow/lab
```

## 1. fmt
`main.tf` is intentionally badly formatted.
```bash
terraform fmt -check ; echo "exit code: $?"   # non-zero: needs formatting
terraform fmt -diff
terraform fmt -check ; echo "exit code: $?"   # 0 now
```

## 2. validate before init
```bash
terraform validate      # fails: providers not installed yet
terraform init
terraform validate      # Success!
```
Now break something: change `length = var.pet_length` to `length = var.does_not_exist` and validate again.
Undo the change.

## 3. plan
```bash
terraform plan
terraform plan -out=tfplan
terraform show tfplan
terraform plan -detailed-exitcode ; echo "exit code: $?"   # 2 = changes pending
```

## 4. apply
```bash
terraform apply tfplan          # no prompt — saved plan
terraform plan -detailed-exitcode ; echo "exit code: $?"   # 0 = no changes
terraform apply -var 'pet_length=4'   # interactive; notice the replacement (-/+)
terraform output
terraform output -raw pet_name
```

## 5. replace & target
```bash
terraform apply -replace='random_pet.this'     # force replacement of one resource
terraform plan -target='local_file.pet'        # note the warning about -target
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

## 7. destroy
```bash
terraform plan -destroy
terraform destroy
```

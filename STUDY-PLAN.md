# Study Plan

## 4-week plan (≈ 1 hour/day, weekdays)

| Week | Day | Work |
|---|---|---|
| 1 | Mon | Install Terraform. Read [Lesson 01](lessons/01-iac-concepts/README.md), do its lab |
| 1 | Tue | [Lesson 02](lessons/02-terraform-fundamentals/README.md) reading |
| 1 | Wed | Lesson 02 lab (providers, lock file, multiple provider configs) |
| 1 | Thu | [Lesson 03](lessons/03-core-workflow/README.md) reading + lab |
| 1 | Fri | Review quizzes 01–03, [CLI cheatsheet](cheatsheets/cli.md), flashcards 1–30 |
| 2 | Mon | [Lesson 04](lessons/04-terraform-configuration/README.md) part 1: resources, data, variables, outputs |
| 2 | Tue | Lesson 04 part 2: types, expressions, functions, `for`, `dynamic` |
| 2 | Wed | Lesson 04 part 3: meta-arguments, dependencies, custom conditions, sensitive data |
| 2 | Thu | Lesson 04 lab (all parts) |
| 2 | Fri | Lesson 04 quiz + [HCL cheatsheet](cheatsheets/hcl.md); experiment in `terraform console` |
| 3 | Mon | [Lesson 05](lessons/05-modules/README.md) reading |
| 3 | Tue | Lesson 05 lab |
| 3 | Wed | [Lesson 06](lessons/06-state-management/README.md) reading |
| 3 | Thu | Lesson 06 lab (state commands, `moved`, `removed`, backends) |
| 3 | Fri | [Lesson 07](lessons/07-maintain-infrastructure/README.md) reading + lab (import, logging) |
| 4 | Mon | [Lesson 08](lessons/08-hcp-terraform/README.md) reading; optionally sign up for HCP Terraform free tier and do the lab |
| 4 | Tue | [Practice exam 1](practice-exams/practice-exam-1.md) — timed (60 min) |
| 4 | Wed | Review every wrong answer, re-read the lessons concerned |
| 4 | Thu | [Practice exam 2](practice-exams/practice-exam-2.md) — timed |
| 4 | Fri | [Flashcards](flashcards.md) full pass; book the exam if scoring ≥ 85% |

## 1-week crash plan (experienced users)

| Day | Work |
|---|---|
| 1 | Skim lessons 01–03, do labs 02 and 03 |
| 2 | Lesson 04 in full + lab |
| 3 | Lessons 05 + 06 + labs |
| 4 | Lessons 07 + 08 |
| 5 | Practice exam 1, review |
| 6 | Practice exam 2, review, flashcards |
| 7 | Rest; light flashcard review; take the exam |

## Exam-day tips

- Read every word: "**NOT**", "**best**", "**first**", "select **two**".
- Mark hard questions and come back; there is no penalty for guessing, so never leave a blank.
- Most questions test *what Terraform does by default* — know the defaults (local backend, `terraform.tfstate`,
  `-parallelism=10`, lock file committed, `.terraform/` not committed, etc.).
- Command-behavior questions are common: know exactly what `init`, `validate`, `plan`, `apply`,
  `fmt`, `state`, `import`, `output`, `show`, `console`, `workspace`, `login` do and **don't** do.

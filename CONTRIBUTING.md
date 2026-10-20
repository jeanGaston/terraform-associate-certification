# Contributing

Thanks for helping! Corrections are the most valuable contribution: this course was written with AI assistance,
so wrong answers, outdated facts and unclear explanations are expected to slip through.

## Ground rules

- **Back every correction with a source.** Link the official [Terraform docs](https://developer.hashicorp.com/terraform/docs)
  (or another HashiCorp page) in the issue or pull request.
- **Never add real exam questions.** They're covered by HashiCorp's exam agreement. Every question here is
  original and written to exercise an [exam objective](EXAM-OBJECTIVES.md).
- **Labs must stay free and local.** Only use the `local`, `random`, `null` and `time` providers and
  `terraform_data`: no cloud accounts, credentials or costs. Lab 08 (HCP Terraform) is the one exception and
  uses a free HCP Terraform organization.
- By contributing, you agree that your code is licensed under [MIT](LICENSE) and your course content under
  [CC BY 4.0](LICENSE-CONTENT).

## Reporting a problem

[Open an issue](https://github.com/jeanGaston/terraform-associate-certification/issues/new/choose) and pick **Content error** (a wrong answer, outdated fact or broken lab
step) or **Bug** (the website, lab server or Docker image misbehaves).

## Making a change

1. Fork the repo and create a branch.
2. Edit the Markdown. The website is generated from it, so never edit `site/content.js` by hand.
3. Run the checks:
   ```bash
   python3 scripts/build-site.py     # rebuilds site/content.js and validates quizzes, exams and lab checkpoints
   ./scripts/validate-labs.sh        # only if you changed a lab: terraform fmt/init/validate on every lab
   ```
4. Try it in the website (`python3 scripts/lab-server.py`, or `docker compose up -d --build`).
5. Commit, including the regenerated `site/content.js`, and open a pull request. Commit messages follow
   [Conventional Commits](https://www.conventionalcommits.org/), for example `fix(lesson-04): correct the
   count vs for_each answer`.

## Content formats

`build-site.py` parses these formats and stops with an error if one is malformed.

**Review quizzes** (end of each lesson `README.md`) and **practice exams**: numbered questions with lettered
options, and an answer key table at the bottom. Multiple-answer questions end with `*(Select TWO)*` and list
every correct letter in the key, for example `A, C`.

```markdown
**1.** Which command downloads the providers and modules a configuration needs?
- A. `terraform plan`
- B. `terraform init`

| # | Ans | Explanation |
|---|---|---|
| 1 | B | `init` installs providers and modules and configures the backend. |
```

**Lab checkpoints** (in `lab/LAB.md`): a `question` block asks about what the learner observed, and a `check`
block runs a shell command in the learner's sandbox. The check passes when the command exits 0. Check `id`s must
be unique within a lab.

````markdown
```question
Q: Why does `terraform validate` fail before `terraform init`?
- A. The configuration has a syntax error
- B. The required providers aren't installed yet
answer: B
explain: `validate` needs the provider schemas, which `init` downloads.
```

```check
id: formatted
title: Format main.tf
run: terraform fmt -check
hint: Run `terraform fmt` in the lab directory.
```
````

**Flashcards** (`flashcards.md`): one table row per card, `| # | Question | Answer |`.

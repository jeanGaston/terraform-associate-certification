# HashiCorp Terraform Associate Certification — Course & Training Repo

A self-paced course to prepare for the **HashiCorp Certified: Terraform Associate (004)** exam.
Every lesson pairs a written lesson with a **hands-on lab that runs locally, with no cloud account and no cost**
(labs use the `local`, `random`, `null`, `time` and built-in `terraform_data` providers/resources).

> Always check the [official exam page](https://developer.hashicorp.com/certifications/infrastructure-automation)
> before your exam: objectives, product version and pricing can change.

## Exam at a glance

| Item | Detail |
|---|---|
| Exam code | Terraform Associate (004) |
| Format | Online, proctored, multiple choice / multiple select / true-false |
| Duration | 1 hour |
| Terraform version tested | Terraform 1.12 (004 exam) |
| Validity | 2 years |
| Prerequisites | Basic terminal skills, basic understanding of on-prem and cloud architecture |

## Repository layout

```
.
├── README.md                  ← you are here
├── STUDY-PLAN.md              ← 4-week schedule (and a 1-week crash plan)
├── EXAM-OBJECTIVES.md         ← every objective mapped to a lesson
├── lessons/
│   ├── 01-iac-concepts/
│   ├── 02-terraform-fundamentals/
│   ├── 03-core-workflow/
│   ├── 04-terraform-configuration/
│   ├── 05-modules/
│   ├── 06-state-management/
│   ├── 07-maintain-infrastructure/
│   └── 08-hcp-terraform/
│       ├── README.md          ← the lesson + review quiz
│       └── lab/               ← runnable Terraform code + LAB.md instructions
├── practice-exams/            ← two full-length practice exams with explained answers
├── cheatsheets/               ← CLI, HCL, and state/backends quick references
├── flashcards.md              ← rapid-recall Q&A
└── scripts/validate-labs.sh   ← runs fmt/init/validate on every lab
```

## Getting started

1. Install Terraform ≥ 1.12: <https://developer.hashicorp.com/terraform/install>
   ```bash
   terraform version
   ```
2. Clone/open this repo and start with [lesson 01](lessons/01-iac-concepts/README.md).
3. For each lesson:
   - Read `README.md`
   - Do the lab in `lab/` (instructions in `lab/LAB.md`)
   - Answer the review quiz at the bottom of the lesson
4. After lesson 08, take [practice exam 1](practice-exams/practice-exam-1.md), review weak areas,
   then take [practice exam 2](practice-exams/practice-exam-2.md). Aim for **≥ 85%** before booking.

## Lessons

| # | Lesson | Exam objective |
|---|---|---|
| 01 | [Infrastructure as Code concepts](lessons/01-iac-concepts/README.md) | 1 |
| 02 | [Terraform fundamentals: providers, install, versions](lessons/02-terraform-fundamentals/README.md) | 2 |
| 03 | [The core Terraform workflow](lessons/03-core-workflow/README.md) | 3 |
| 04 | [Terraform configuration (HCL deep dive)](lessons/04-terraform-configuration/README.md) | 4 |
| 05 | [Modules](lessons/05-modules/README.md) | 5 |
| 06 | [State management](lessons/06-state-management/README.md) | 6 |
| 07 | [Maintaining infrastructure](lessons/07-maintain-infrastructure/README.md) | 7 |
| 08 | [HCP Terraform](lessons/08-hcp-terraform/README.md) | 8 |

## Validate all labs

```bash
./scripts/validate-labs.sh
```

## Official resources

- Exam content list & review guide: <https://developer.hashicorp.com/terraform/tutorials/certification-associate-tutorials-004>
- Terraform docs: <https://developer.hashicorp.com/terraform/docs>
- Terraform language: <https://developer.hashicorp.com/terraform/language>
- HCP Terraform: <https://developer.hashicorp.com/terraform/cloud-docs>
- Terraform Registry: <https://registry.terraform.io>

## Disclaimer

This is an independent study resource, not affiliated with or endorsed by HashiCorp.
Practice questions are original and written to exercise the objectives; they are not real exam questions.

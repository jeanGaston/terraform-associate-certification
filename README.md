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
├── site/                      ← interactive training website (see below)
├── Dockerfile, compose.yaml   ← run the site + labs in a container
└── scripts/
    ├── validate-labs.sh       ← runs fmt/init/validate on every lab
    ├── build-site.py          ← bundles the Markdown into site/content.js
    ├── lab-server.py          ← serves the site + in-browser lab terminals
    └── setup-wsl.sh           ← installs Terraform into ~/.local/bin (WSL/Linux/macOS)
```

## Getting started

1. Install Terraform ≥ 1.12 ([official instructions](https://developer.hashicorp.com/terraform/install)).
   On WSL/Linux/macOS you can use the bundled script, which installs it into `~/.local/bin` (no sudo):
   ```bash
   ./scripts/setup-wsl.sh
   terraform version
   ```
   Prefer containers? Skip this step and use [Docker](#option-a--docker-recommended) instead.
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

## Training website

The whole course is also available as an interactive website in [`site/`](site/): lessons and labs,
timed practice exams (or study mode with instant explanations; questions and options are shuffled on every
attempt, and a "Random mix" exam draws 40 questions from both), flashcards with mastery tracking,
a clickable objectives checklist, full-text search, and a progress dashboard. Progress is saved in your browser.

### Do the labs in your browser

#### Option A — Docker (recommended)

Nothing to install except Docker. Terraform and the lab tools are inside the image:

```bash
docker compose up -d --build           # then open http://localhost:8000
docker compose logs -f                 # server logs
docker compose down                    # stop (your lab sandboxes are kept)
docker compose down -v                 # stop and delete sandboxes + provider cache
```

- The site is published on `127.0.0.1` only. Use `LAB_PORT=9000 docker compose up -d` to change the port,
  and `TERRAFORM_VERSION=1.12.2 docker compose up -d --build` to pin another Terraform version.
- Your lab sandboxes live in the `lab-workspace` volume. Providers and `terraform login` credentials (lab 08)
  live in `terraform-home`. Both survive restarts and rebuilds.
- After editing course Markdown, run `docker compose up -d --build` to rebuild the image with the new content.

#### Option B — natively (WSL, Linux, macOS)

```bash
./scripts/setup-wsl.sh                 # once: installs Terraform into ~/.local/bin
python3 scripts/lab-server.py          # then open http://localhost:8000
```

#### How it works

The lab server serves the site and turns each lesson's **Hands-on lab** tab into a workbench:
the instructions on one side, and on the other real terminals (bash + Terraform on your machine)
and a file editor. Click ▶ next to any command in the instructions to run it. Each lab runs in a
sandbox copy under `.lab-workspace/<lesson>/` (gitignored), so the course files stay untouched.
Use **Reset lab** to start a lab over.

Labs contain **checkpoints**: `question` blocks (multiple choice about what you observed) and `check` blocks
(the lab server runs the check's command in your sandbox to verify the step, for example that a resource is in
state or a file was changed). A lab is complete when every checkpoint passes. Without the lab server, checks
can be confirmed by hand. Lessons unlock in order: read the lesson, pass its quiz (80%+) and complete its lab.
From lesson 02 on, each quiz also includes review questions from earlier lessons' quizzes and labs (2 to 5,
questions you missed before first), and they count towards the score.

- Natively, it needs Linux, macOS or WSL, plus Terraform on your `PATH`. In Docker, sandboxes are in a volume instead of `.lab-workspace/`.
- Listens on `127.0.0.1` only, and API calls need a per-run token, so other websites can't reach your shell.
- The dashboard's **Reset all progress** button clears your saved progress and every lab sandbox.
  Natively, `python3 scripts/lab-server.py --reset` does the same from the command line: it deletes all lab sandboxes and clears the saved progress in your
  browser the next time you open the site.

### Static mode

```bash
python3 scripts/build-site.py          # regenerate site/content.js after editing any Markdown
python3 -m http.server -d site 8000    # then open http://localhost:8000
```

Opening `site/index.html` directly also works. Without the lab server, labs show their instructions for
you to follow in your own terminal. The static site can be hosted on GitHub Pages by publishing the `site/` folder.

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

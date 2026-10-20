# HashiCorp Terraform Associate Certification — Course & Training Repo

A self-paced course to prepare for the **HashiCorp Certified: Terraform Associate (004)** exam.
Every lesson pairs a written lesson with a **hands-on lab that runs locally, with no cloud account and no cost**
(labs use the `local`, `random`, `null`, `time` and built-in `terraform_data` providers/resources).
Everything is served by an interactive training website with in-browser lab terminals.

**Just want to read and practise?** Open the online version: <https://jeangaston.github.io/terraform-associate-certification/>.
It has every lesson, quiz, practice exam and flashcard, and saves your progress in your own browser.
For the in-browser lab terminals, run the Docker image below.

> [!WARNING]
> **Not affiliated with HashiCorp or IBM.** This is an unofficial, personal project, vibecoded with AI
> for learning only. It may contain mistakes: always cross-check with the
> [official Terraform docs](https://developer.hashicorp.com/terraform/docs) and the
> [official exam page](https://developer.hashicorp.com/certifications/infrastructure-automation).
> See the [full disclaimer](#disclaimer).

## Quick start (Docker image)

Nothing to install except Docker. CI publishes a ready-to-run image (amd64 + arm64) with Terraform and every
lab tool preinstalled to `ghcr.io/jeangaston/terraform-associate-certification`, rebuilt on every push to `main`.

**1. Start the server**, from a clone of this repo:

```bash
docker compose pull                    # get the latest image
docker compose up -d                   # then open http://localhost:8000
```

Or without cloning anything, with plain `docker run`:

```bash
docker run -d --name terraform-associate --init \
  -p 127.0.0.1:8000:8000 \
  -v tfa-lab-workspace:/course/.lab-workspace \
  -v tfa-terraform-home:/home/learner/.terraform.d \
  ghcr.io/jeangaston/terraform-associate-certification:latest
```

**2. Day to day:**

| Task | Compose | `docker run` |
|---|---|---|
| Server logs | `docker compose logs -f` | `docker logs -f terraform-associate` |
| Stop (lab sandboxes are kept) | `docker compose down` | `docker rm -f terraform-associate` |
| Update to the latest course | `docker compose pull && docker compose up -d` | `docker pull …:latest`, then remove and re-run the container |
| Wipe sandboxes + provider cache | `docker compose down -v` | `docker volume rm tfa-lab-workspace tfa-terraform-home` |

- The site is only published on `127.0.0.1`, never on your network. With compose, `LAB_PORT=9000 docker compose up -d`
  changes the port.
- Your lab sandboxes live in the `lab-workspace` volume. Providers and `terraform login` credentials (lab 08)
  live in `terraform-home`. Both survive restarts and image updates.
- Your course progress (lessons, quizzes, exams, flashcards) is saved in your browser, not in the container.

### Other ways to run it

**Build the image yourself**, for example after editing course Markdown or to pin another Terraform version:

```bash
docker compose up -d --build
TERRAFORM_VERSION=1.12.2 docker compose up -d --build
```

**Natively** (WSL, Linux, macOS), with Terraform on your machine:

```bash
./scripts/setup-wsl.sh                 # once: installs Terraform into ~/.local/bin (no sudo)
python3 scripts/lab-server.py          # then open http://localhost:8000
```

**Static site only** (no lab terminals; labs show their instructions for you to follow in your own terminal):

```bash
python3 scripts/build-site.py          # regenerate site/content.js after editing any Markdown
python3 -m http.server -d site 8000    # then open http://localhost:8000
```

Opening `site/index.html` directly also works. This static mode is what the
[online version](https://jeangaston.github.io/terraform-associate-certification/) on GitHub Pages runs.

## How to study

1. Start the server (above) and open [lesson 01](lessons/01-iac-concepts/README.md). You can also read
   the Markdown straight from this repo and run the labs in your own terminal.
2. For each lesson: read the lesson, do the hands-on lab, then pass the review quiz.
   Lessons unlock in order. A lesson is complete when its quiz is passed (80%+) and its lab is done.
3. After lesson 08, take [practice exam 1](practice-exams/practice-exam-1.md), review weak areas,
   then take [practice exam 2](practice-exams/practice-exam-2.md). Aim for **≥ 85%** before booking.

[STUDY-PLAN.md](STUDY-PLAN.md) has a 4-week schedule (and a 1-week crash plan), and
[EXAM-OBJECTIVES.md](EXAM-OBJECTIVES.md) maps every objective to a lesson.

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

## The training website

- **Lessons and labs**, with a progress dashboard and a progress bar across the course.
- **Practice exams**: timed, or study mode with instant explanations. Questions and options are shuffled on every
  attempt, and a "Random mix" exam draws 40 questions from both exams.
- **Flashcards** with mastery tracking, a clickable **objectives checklist** and **full-text search**.

### In-browser labs

The lab server turns each lesson's **Hands-on lab** tab into a workbench: the instructions on one side, and on
the other real terminals (bash + Terraform) and a file editor. Click ▶ next to any command in the instructions
to run it. Each lab runs in a sandbox copy of the lab folder (a Docker volume, or `.lab-workspace/<lesson>/`
natively), so the course files stay untouched. Use **Reset lab** to start a lab over.

Labs contain **checkpoints**: `question` blocks (multiple choice about what you observed) and `check` blocks
(the lab server runs the check's command in your sandbox to verify the step, for example that a resource is in
state or a file was changed). A lab is complete when every checkpoint passes. Without the lab server, checks
can be confirmed by hand. From lesson 02 on, each quiz also includes 2 to 5 review questions from earlier
lessons' quizzes and labs (questions you missed before come first), and they count towards the score.

- The server listens on `127.0.0.1` only, and API calls need a per-run token, so other websites can't reach your shell.
- The dashboard's **Reset all progress** button clears your saved progress and every lab sandbox.
  Natively, `python3 scripts/lab-server.py --reset` does the same from the command line: it deletes all lab
  sandboxes and clears the saved progress in your browser the next time you open the site.

## Exam at a glance

| Item | Detail |
|---|---|
| Exam code | Terraform Associate (004) |
| Format | Online, proctored, multiple choice / multiple select / true-false |
| Duration | 1 hour |
| Terraform version tested | Terraform 1.12 (004 exam) |
| Validity | 2 years |
| Prerequisites | Basic terminal skills, basic understanding of on-prem and cloud architecture |

Objectives, product version and pricing can change: check the
[official exam page](https://developer.hashicorp.com/certifications/infrastructure-automation) before your exam.

## Repository layout

```
.
├── README.md                  ← you are here
├── LICENSE, LICENSE-CONTENT   ← MIT (code) and CC BY 4.0 (course content)
├── CONTRIBUTING.md            ← how to report errors and send fixes
├── STUDY-PLAN.md              ← 4-week schedule (and a 1-week crash plan)
├── EXAM-OBJECTIVES.md         ← every objective mapped to a lesson
├── lessons/
│   ├── 01-iac-concepts/
│   ├── …
│   └── 08-hcp-terraform/
│       ├── README.md          ← the lesson + review quiz
│       └── lab/               ← runnable Terraform code + LAB.md instructions
├── practice-exams/            ← two full-length practice exams with explained answers
├── cheatsheets/               ← CLI, HCL, and state/backends quick references
├── flashcards.md              ← rapid-recall Q&A
├── site/                      ← interactive training website
├── Dockerfile, compose.yaml   ← run the site + labs in a container
├── .github/                   ← CI (Docker image, Pages), issue and PR templates
└── scripts/
    ├── validate-labs.sh       ← runs fmt/init/validate on every lab
    ├── build-site.py          ← bundles the Markdown into site/content.js
    ├── lab-server.py          ← serves the site + in-browser lab terminals
    └── setup-wsl.sh           ← installs Terraform into ~/.local/bin (WSL/Linux/macOS)
```

## Development

```bash
./scripts/validate-labs.sh             # terraform fmt/init/validate on every lab
python3 scripts/build-site.py          # regenerate site/content.js after editing any Markdown
```

The [Docker image workflow](.github/workflows/docker-publish.yml) builds the image on every pull request and
publishes it on every push to `main` (`:latest` + short commit SHA) and on `vX.Y.Z` tags (`:X.Y.Z`, `:X.Y`).
The [Pages workflow](.github/workflows/pages.yml) rebuilds `site/content.js` and deploys `site/` to GitHub Pages
on every push to `main`.

## Contributing

Found a wrong answer, an outdated fact or a bug? [Open an issue](https://github.com/jeanGaston/terraform-associate-certification/issues/new/choose)
or send a pull request. [CONTRIBUTING.md](CONTRIBUTING.md) explains the ground rules and the content formats.

## Official resources

- Exam content list & review guide: <https://developer.hashicorp.com/terraform/tutorials/certification-associate-tutorials-004>
- Terraform docs: <https://developer.hashicorp.com/terraform/docs>
- Terraform language: <https://developer.hashicorp.com/terraform/language>
- HCP Terraform: <https://developer.hashicorp.com/terraform/cloud-docs>
- Terraform Registry: <https://registry.terraform.io>

## Disclaimer

- **Not affiliated with, endorsed by or sponsored by HashiCorp or IBM.** Terraform and HCP Terraform are
  trademarks of HashiCorp, Inc., used here only to identify the subject of the course.
- **Vibecoded, for learning only.** The course content, labs, website and tooling were largely generated with
  AI assistance as a personal learning project. They may contain errors or be out of date, and nothing here is
  production guidance.
- **Not real exam questions.** Practice questions are original and written to exercise the objectives.
  Passing them does not guarantee passing the real exam.
- Provided as is, with no warranty. Always cross-check with the official HashiCorp documentation.

## License

- **Code** (`scripts/`, `site/`, the Dockerfile, CI and the lab `.tf` files): [MIT](LICENSE).
- **Course content** (lessons, lab guides, quizzes, practice exams, flashcards, cheatsheets and other Markdown):
  [CC BY 4.0](LICENSE-CONTENT). You may share and adapt it, including commercially, as long as you give credit
  and link back to this repository.

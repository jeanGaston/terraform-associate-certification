# Lesson 01 — Infrastructure as Code (IaC) with Terraform

**Objectives covered:** 1a, 1b, 1c · **Time:** ~45 min

## 1. What is Infrastructure as Code?

Infrastructure as Code is managing and provisioning infrastructure (networks, VMs, DNS records, databases,
SaaS settings…) through **machine-readable definition files** instead of manual processes such as clicking
through a web console or running one-off scripts.

Two main styles:

| Style | You describe… | Examples |
|---|---|---|
| **Declarative** | the *desired end state*; the tool figures out the steps | Terraform, CloudFormation, Kubernetes manifests |
| **Imperative / procedural** | the *exact steps* to run in order | Bash scripts, most SDK scripts |

**Terraform is declarative.** You write *what* you want; Terraform compares that to reality (via state)
and computes *how* to get there (the plan).

Related distinction:

- **Provisioning tools** (Terraform) create the infrastructure itself.
- **Configuration management tools** (Ansible, Chef, Puppet) configure software *on* existing machines.
  They can overlap, but Terraform's sweet spot is provisioning.

- **Mutable** infrastructure is changed in place (patching a server).
- **Immutable** infrastructure is replaced rather than changed (build a new image, swap servers).
  Terraform encourages immutable patterns: many attribute changes force a **replace** (destroy + create).

## 2. Advantages of IaC

| Benefit | Why it matters |
|---|---|
| **Version control** | Infra lives in Git: history, diffs, code review, rollback |
| **Repeatability / consistency** | The same code creates identical dev/stage/prod environments; eliminates config drift from manual changes |
| **Automation & speed** | Environments created in minutes; fits into CI/CD |
| **Self-documenting** | The code *is* the documentation of what exists |
| **Collaboration** | Teams review changes before they happen (plan output in PRs) |
| **Reusability** | Modules package best practices for reuse |
| **Reduced risk** | Preview changes (`terraform plan`) before applying; fewer human errors |
| **Cost & lifecycle control** | Easy to destroy temporary environments |

## 3. How Terraform works (the big picture)

```
 ┌────────────┐   terraform plan/apply    ┌──────────────┐   API calls   ┌──────────────────┐
 │ .tf files  │ ────────────────────────▶ │ Terraform    │ ────────────▶ │ AWS / Azure /    │
 │ (desired)  │                           │ Core + state │               │ GCP / GitHub /   │
 └────────────┘                           └──────┬───────┘               │ Kubernetes / ... │
                                                 │ gRPC                   └──────────────────┘
                                          ┌──────▼───────┐
                                          │  Providers   │ (plugins)
                                          └──────────────┘
```

- **Terraform Core** — the `terraform` binary. Reads config, manages state, builds the dependency graph,
  computes the plan, and calls providers.
- **Providers** — plugins that translate Terraform resources into API calls for a specific platform.
- **State** — Terraform's record mapping config resources to real-world objects (Lesson 06).

Terraform is written in Go, ships as a single binary, and configuration is written in **HCL**
(HashiCorp Configuration Language) or, less commonly, JSON (`*.tf.json`).

## 4. Multi-cloud, hybrid cloud, and service-agnostic workflows

- **Multi-cloud:** one tool, one language, one workflow to manage AWS, Azure, GCP, etc. in the same
  configuration. Resources from different providers can reference each other (e.g. create a VM in AWS and a DNS
  record in Cloudflare pointing to it).
- **Hybrid cloud:** providers exist for on-prem platforms (vSphere, Nutanix, OpenStack) as well as public clouds.
- **Service-agnostic:** providers exist for thousands of non-infrastructure APIs: GitHub, Datadog, PagerDuty,
  Kubernetes, Helm, Okta, Vault… If it has an API, there's probably a provider.

Important nuance for the exam: Terraform is **cloud-agnostic as a tool**, but configurations are **not portable**
between clouds. An `aws_instance` cannot be "switched" to Azure; you write `azurerm_linux_virtual_machine` instead.
What you keep is the *workflow*, language, and tooling.

## 5. Terraform editions (know the names)

| Edition | What |
|---|---|
| **Terraform Community Edition (CLI)** | Free binary; you manage state and execution yourself |
| **HCP Terraform** (formerly *Terraform Cloud*) | SaaS: remote state, remote runs, VCS integration, private registry, policies, team access |
| **Terraform Enterprise** | Self-hosted distribution of HCP Terraform |

## Key takeaways

- Terraform = **declarative**, **provisioning**, **agentless**, **cloud-agnostic workflow**.
- Plan before apply → predictable changes.
- State lets Terraform map config to real resources and compute diffs.

## Review quiz

1. Is Terraform declarative or imperative? What does that mean?
2. Name four benefits of IaC.
3. True/False: A Terraform configuration written for AWS can be applied to Azure by changing the provider.
4. What component translates Terraform resources into platform API calls?
5. Which is the self-hosted version of HCP Terraform?

<details><summary>Answers</summary>

1. Declarative — you describe the desired end state and Terraform works out the steps.
2. Any four of: version control, repeatability, automation, self-documentation, collaboration, reuse, reduced risk via plan, consistency across environments.
3. **False** — resource types are provider-specific. The *workflow* is portable, the code is not.
4. A **provider** (plugin).
5. **Terraform Enterprise**.
</details>

➡️ Lab: [lab/LAB.md](lab/LAB.md)

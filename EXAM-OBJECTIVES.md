# Exam Objectives → Lesson Map (Terraform Associate 004)

Tick each box once you can explain the topic *and* have done it in a lab.

## 1. Infrastructure as Code (IaC) with Terraform → [Lesson 01](lessons/01-iac-concepts/README.md)
- [ ] 1a Explain what IaC is
- [ ] 1b Describe the advantages of IaC patterns
- [ ] 1c Explain how Terraform manages multi-cloud, hybrid cloud, and service-agnostic workflows

## 2. Terraform fundamentals → [Lesson 02](lessons/02-terraform-fundamentals/README.md)
- [ ] 2a Install and version Terraform providers
- [ ] 2b Describe how Terraform uses providers
- [ ] 2c Write Terraform configuration using multiple providers
- [ ] 2d Explain how Terraform uses and manages state

## 3. Core Terraform workflow → [Lesson 03](lessons/03-core-workflow/README.md)
- [ ] 3a Describe the Terraform workflow (Write → Plan → Apply)
- [ ] 3b Initialize a working directory (`terraform init`)
- [ ] 3c Validate a configuration (`terraform validate`)
- [ ] 3d Generate and review an execution plan (`terraform plan`)
- [ ] 3e Apply changes (`terraform apply`)
- [ ] 3f Destroy infrastructure (`terraform destroy`)
- [ ] 3g Apply formatting and style adjustments (`terraform fmt`)

## 4. Terraform configuration → [Lesson 04](lessons/04-terraform-configuration/README.md)
- [ ] 4a Use and differentiate resource and data blocks
- [ ] 4b Refer to resource attributes and create cross-resource references
- [ ] 4c Use variables and outputs
- [ ] 4d Understand and use complex types
- [ ] 4e Write dynamic configuration using expressions and functions
- [ ] 4f Define resource dependencies
- [ ] 4g Validate configuration using custom conditions
- [ ] 4h Understand best practices for managing sensitive data, including secrets management with Vault

## 5. Terraform modules → [Lesson 05](lessons/05-modules/README.md)
- [ ] 5a Explain how Terraform sources modules
- [ ] 5b Describe variable scope within modules
- [ ] 5c Use modules in configuration
- [ ] 5d Manage module versions

## 6. Terraform state management → [Lesson 06](lessons/06-state-management/README.md)
- [ ] 6a Describe the local backend
- [ ] 6b Describe state locking
- [ ] 6c Configure remote state using the `backend` block
- [ ] 6d Manage resource drift and Terraform state

## 7. Maintain infrastructure with Terraform → [Lesson 07](lessons/07-maintain-infrastructure/README.md)
- [ ] 7a Import existing infrastructure into your Terraform workspace
- [ ] 7b Use the CLI to inspect state
- [ ] 7c Describe when and how to use verbose logging

## 8. HCP Terraform → [Lesson 08](lessons/08-hcp-terraform/README.md)
- [ ] 8a Use HCP Terraform to create infrastructure
- [ ] 8b Describe HCP Terraform collaboration and governance features
- [ ] 8c Describe how to organize and use HCP Terraform workspaces and projects
- [ ] 8d Configure and use HCP Terraform integration

> Source: the official 004 exam content list. Wording is paraphrased; verify against
> <https://developer.hashicorp.com/terraform/tutorials/certification-associate-tutorials-004>.

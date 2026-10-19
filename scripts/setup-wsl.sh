#!/usr/bin/env bash
# Native setup for WSL / Linux / macOS, no sudo needed.
# Installs Terraform into ~/.local/bin (checksum-verified) and checks Python for the lab server.
#   ./scripts/setup-wsl.sh                 # latest Terraform
#   TERRAFORM_VERSION=1.12.2 ./scripts/setup-wsl.sh
set -euo pipefail

BIN_DIR="${BIN_DIR:-$HOME/.local/bin}"
VERSION="${TERRAFORM_VERSION:-$(curl -fsSL https://checkpoint-api.hashicorp.com/v1/check/terraform \
  | python3 -c 'import sys, json; print(json.load(sys.stdin)["current_version"])')}"

case "$(uname -s)" in Linux) os=linux ;; Darwin) os=darwin ;; *) echo "Unsupported OS: $(uname -s)"; exit 1 ;; esac
case "$(uname -m)" in x86_64|amd64) arch=amd64 ;; aarch64|arm64) arch=arm64 ;; *) echo "Unsupported CPU: $(uname -m)"; exit 1 ;; esac

command -v python3 >/dev/null || { echo "python3 is required (sudo apt install python3)"; exit 1; }

if command -v terraform >/dev/null && terraform version | sed -n 1p | grep "v${VERSION}$" >/dev/null; then
  echo "Terraform ${VERSION} already installed: $(command -v terraform)"
else
  echo "==> Installing Terraform ${VERSION} (${os}_${arch}) into ${BIN_DIR}"
  tmp="$(mktemp -d)"; trap 'rm -rf "$tmp"' EXIT
  zip="terraform_${VERSION}_${os}_${arch}.zip"
  base="https://releases.hashicorp.com/terraform/${VERSION}"
  curl -fsSL -o "$tmp/$zip" "$base/$zip"
  curl -fsSL -o "$tmp/SHA256SUMS" "$base/terraform_${VERSION}_SHA256SUMS"
  sha256() { if command -v sha256sum >/dev/null; then sha256sum "$@"; else shasum -a 256 "$@"; fi; }
  (cd "$tmp" && grep " ${zip}\$" SHA256SUMS | sha256 -c -)
  python3 -c "import sys, zipfile; zipfile.ZipFile(sys.argv[1]).extract('terraform', sys.argv[2])" "$tmp/$zip" "$tmp"
  mkdir -p "$BIN_DIR"
  install -m 0755 "$tmp/terraform" "$BIN_DIR/terraform"
fi

# Shared provider cache: labs re-init often, this avoids re-downloading providers each time.
mkdir -p "$HOME/.terraform.d/plugin-cache"
if [[ ! -f "$HOME/.terraformrc" ]]; then
  echo "plugin_cache_dir = \"\$HOME/.terraform.d/plugin-cache\"" > "$HOME/.terraformrc"
  echo "==> Wrote ~/.terraformrc (provider plugin cache)"
fi

case ":$PATH:" in
  *":$BIN_DIR:"*) ;;
  *) echo "NOTE: add ${BIN_DIR} to your PATH:  echo 'export PATH=\"${BIN_DIR}:\$PATH\"' >> ~/.bashrc" ;;
esac

"$BIN_DIR/terraform" version | sed -n 1p
echo
echo "Done. Start the training site with labs:  python3 scripts/lab-server.py   ->  http://localhost:8000"

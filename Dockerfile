# Training site + in-browser lab terminals, with Terraform preinstalled.
#   docker compose up -d --build     ->  http://localhost:8000
FROM python:3.12-slim-bookworm

ARG TERRAFORM_VERSION=1.16.6
ARG TARGETARCH

# Tools the labs use in their shells (coreutils/grep/diff come with the base image).
RUN apt-get update \
 && apt-get install -y --no-install-recommends ca-certificates curl unzip git tree jq less nano vim \
 && rm -rf /var/lib/apt/lists/* \
 && printf '%s\n' 'syntax on' 'filetype plugin indent on' 'set expandtab tabstop=2 shiftwidth=2 softtabstop=2' \
      'set number ruler hlsearch incsearch backspace=indent,eol,start' > /etc/vim/vimrc.local

# Terraform, verified against HashiCorp's published SHA256SUMS.
RUN set -eux; \
    arch="${TARGETARCH:-amd64}"; \
    zip="terraform_${TERRAFORM_VERSION}_linux_${arch}.zip"; \
    base="https://releases.hashicorp.com/terraform/${TERRAFORM_VERSION}"; \
    cd /tmp; \
    curl -fsSLO "${base}/${zip}"; \
    curl -fsSLO "${base}/terraform_${TERRAFORM_VERSION}_SHA256SUMS"; \
    grep " ${zip}\$" "terraform_${TERRAFORM_VERSION}_SHA256SUMS" | sha256sum -c -; \
    unzip -q "${zip}" terraform -d /usr/local/bin; \
    rm -f /tmp/terraform_*; \
    terraform version

RUN useradd --create-home --uid 1000 --shell /bin/bash learner
USER learner
WORKDIR /course

COPY --chown=learner:learner . .
RUN python3 scripts/build-site.py \
 && mkdir -p .lab-workspace /home/learner/.terraform.d/plugin-cache

ENV PYTHONUNBUFFERED=1 \
    EDITOR=vim \
    TF_PLUGIN_CACHE_DIR=/home/learner/.terraform.d/plugin-cache

EXPOSE 8000
HEALTHCHECK --interval=30s --timeout=5s --start-period=5s \
  CMD python3 -c "import urllib.request; urllib.request.urlopen('http://127.0.0.1:8000/api/session', timeout=4)"

# 0.0.0.0 is needed inside the container; compose publishes the port on the host's 127.0.0.1 only.
CMD ["python3", "scripts/lab-server.py", "--host", "0.0.0.0", "--no-build"]

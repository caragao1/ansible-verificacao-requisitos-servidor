#!/usr/bin/env bash
set -euo pipefail

usage() {
  cat <<EOF
Uso: $0 --ip <ip> --porta <porta_ssh> --senha <senha_root> --dispositivos <qtd> --dominio <dominio> --jira-issue <CHAVE-123>

Variaveis de ambiente obrigatorias:
  JIRA_BASE_URL   Ex: https://suaempresa.atlassian.net
  JIRA_EMAIL      E-mail da conta usada para gerar o API token
  JIRA_API_TOKEN  API token do Jira Cloud
EOF
  exit 1
}

IP=""
PORTA="22"
SENHA=""
DISPOSITIVOS=""
DOMINIO=""
JIRA_ISSUE=""

while [[ $# -gt 0 ]]; do
  case "$1" in
    --ip) IP="$2"; shift 2 ;;
    --porta) PORTA="$2"; shift 2 ;;
    --senha) SENHA="$2"; shift 2 ;;
    --dispositivos) DISPOSITIVOS="$2"; shift 2 ;;
    --dominio) DOMINIO="$2"; shift 2 ;;
    --jira-issue) JIRA_ISSUE="$2"; shift 2 ;;
    -h|--help) usage ;;
    *) echo "Argumento desconhecido: $1" >&2; usage ;;
  esac
done

if [[ -z "$IP" || -z "$SENHA" || -z "$DISPOSITIVOS" || -z "$DOMINIO" || -z "$JIRA_ISSUE" ]]; then
  usage
fi

: "${JIRA_BASE_URL:?Defina a variavel de ambiente JIRA_BASE_URL}"
: "${JIRA_EMAIL:?Defina a variavel de ambiente JIRA_EMAIL}"
: "${JIRA_API_TOKEN:?Defina a variavel de ambiente JIRA_API_TOKEN}"

if ! command -v sshpass >/dev/null 2>&1; then
  echo "Erro: 'sshpass' nao esta instalado. Instale com: apt install sshpass" >&2
  exit 1
fi

REPO_DIR="$(cd "$(dirname "$0")/.." && pwd)"

TMP_VARS="$(mktemp)"
chmod 600 "$TMP_VARS"
trap 'rm -f "$TMP_VARS"' EXIT

cat > "$TMP_VARS" <<EOF
ansible_user: root
ansible_port: ${PORTA}
ansible_ssh_pass: "${SENHA}"
ansible_ssh_common_args: "-o StrictHostKeyChecking=no -o UserKnownHostsFile=/dev/null"
dispositivos: ${DISPOSITIVOS}
dominio: "${DOMINIO}"
jira_issue_key: "${JIRA_ISSUE}"
EOF

cd "$REPO_DIR"
ansible-playbook -i "${IP}," verificar_requisitos.yml --extra-vars "@${TMP_VARS}"

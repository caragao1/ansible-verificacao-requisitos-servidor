#!/usr/bin/env bash
set -euo pipefail

usage() {
  cat <<EOF
Uso: $0 --ip <ip> --porta <porta_ssh> --senha <senha_root> --dispositivos <qtd> --dominio <dominio> [--jira-issue <CHAVE-123> | --sem-jira]

--sem-jira   Roda so a verificacao de CPU/RAM/disco/dominio/SSL e mostra
             o resultado no terminal, sem comentar em nenhuma issue do
             Jira e sem precisar das variaveis de ambiente abaixo.

Variaveis de ambiente obrigatorias (exceto com --sem-jira):
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
SEM_JIRA=false

while [[ $# -gt 0 ]]; do
  case "$1" in
    --ip) IP="$2"; shift 2 ;;
    --porta) PORTA="$2"; shift 2 ;;
    --senha) SENHA="$2"; shift 2 ;;
    --dispositivos) DISPOSITIVOS="$2"; shift 2 ;;
    --dominio) DOMINIO="$2"; shift 2 ;;
    --jira-issue) JIRA_ISSUE="$2"; shift 2 ;;
    --sem-jira) SEM_JIRA=true; shift ;;
    -h|--help) usage ;;
    *) echo "Argumento desconhecido: $1" >&2; usage ;;
  esac
done

if [[ -z "$IP" || -z "$SENHA" || -z "$DISPOSITIVOS" || -z "$DOMINIO" ]]; then
  usage
fi

if [[ "$SEM_JIRA" == "false" ]]; then
  if [[ -z "$JIRA_ISSUE" ]]; then
    echo "Erro: --jira-issue e obrigatorio (ou use --sem-jira para testar sem integracao com o Jira)." >&2
    usage
  fi
  : "${JIRA_BASE_URL:?Defina a variavel de ambiente JIRA_BASE_URL}"
  : "${JIRA_EMAIL:?Defina a variavel de ambiente JIRA_EMAIL}"
  : "${JIRA_API_TOKEN:?Defina a variavel de ambiente JIRA_API_TOKEN}"
fi

if ! command -v sshpass >/dev/null 2>&1; then
  echo "Erro: 'sshpass' nao esta instalado. Instale com: apt install sshpass" >&2
  exit 1
fi

REPO_DIR="$(cd "$(dirname "$0")/.." && pwd)"

TMP_VARS="$(mktemp)"
chmod 600 "$TMP_VARS"
trap 'rm -f "$TMP_VARS"' EXIT

{
  echo "ansible_user: root"
  echo "ansible_port: ${PORTA}"
  echo "ansible_ssh_pass: \"${SENHA}\""
  echo "ansible_ssh_common_args: \"-o StrictHostKeyChecking=no -o UserKnownHostsFile=/dev/null\""
  echo "dispositivos: ${DISPOSITIVOS}"
  echo "dominio: \"${DOMINIO}\""
  if [[ "$SEM_JIRA" == "true" ]]; then
    echo "comentar_jira: false"
  else
    echo "jira_issue_key: \"${JIRA_ISSUE}\""
  fi
} > "$TMP_VARS"

cd "$REPO_DIR"
ansible-playbook -i "${IP}," verificar_requisitos.yml --extra-vars "@${TMP_VARS}"

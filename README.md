# Verificacao de requisitos do servidor (Ansible)

Playbook que conecta em um servidor via SSH, verifica se ele atende aos
requisitos minimos de CPU, RAM e disco para o plano (quantidade de
dispositivos) contratado, valida dominio/SSL, e comenta o resultado
(aprovado ou motivo da reprovacao) diretamente no card do Jira.

## Tabela de requisitos (`vars/requisitos.yml`)

| Dispositivos ate | CPU Core | SSD    | Memoria |
|-------------------|----------|--------|---------|
| 1.000              | 4        | 40 GB  | 12 GB   |
| 3.000              | 8        | 80 GB  | 16 GB   |
| 8.000              | 8        | 120 GB | 24 GB   |
| 15.000             | 12       | 180 GB | 40 GB   |
| 30.000             | 16       | 240 GB | 64 GB   |
| 100.000            | 24       | 500 GB | 124 GB  |

Os valores medidos devem ser **maiores ou iguais** ao minimo da faixa
correspondente. Um valor acima do exigido nunca reprova a verificacao.

## Dependencias

No **control node** (onde o Ansible roda):
- `ansible-core` >= 2.14
- `sshpass` (autenticacao SSH por senha): `apt install sshpass`
- `openssl` (verificacao de certificado SSL)
- Acesso de rede de saida ao Jira e ao dominio informado (a checagem de
  DNS/SSL e feita a partir do control node, simulando um acesso externo)

No **servidor alvo**:
- `lsblk` (utilitario padrao do `util-linux`, presente na quase totalidade
  das distros Linux)

## Variaveis de ambiente obrigatorias (credenciais do Jira)

Nunca ficam no repositorio. Defina antes de executar:

```bash
export JIRA_BASE_URL="https://suaempresa.atlassian.net"
export JIRA_EMAIL="seu-email@empresa.com"
export JIRA_API_TOKEN="seu-api-token"
```

O `JIRA_API_TOKEN` e gerado em
`https://id.atlassian.com/manage-profile/security/api-tokens`.

## Uso

```bash
./scripts/verificar-servidor.sh \
  --ip 203.0.113.10 \
  --porta 22 \
  --senha 'senha-root' \
  --dispositivos 3000 \
  --dominio cliente.exemplo.com \
  --jira-issue PROJ-123
```

### Testar sem o Jira

Para validar só a checagem de CPU/RAM/disco/dominio/SSL, sem comentar em
nenhuma issue e sem precisar configurar `JIRA_BASE_URL`/`JIRA_EMAIL`/
`JIRA_API_TOKEN`, use `--sem-jira`. O resultado e impresso no terminal:

```bash
./scripts/verificar-servidor.sh \
  --ip 203.0.113.10 \
  --porta 22 \
  --senha 'senha-root' \
  --dispositivos 3000 \
  --dominio cliente.exemplo.com \
  --sem-jira
```

O script:
1. Grava os parametros num arquivo temporario (`chmod 600`, apagado ao
   final) para a senha nao aparecer em `ps aux`.
2. Chama `ansible-playbook` contra o IP informado.
3. Retorna exit code `0` se o servidor foi aprovado, ou `!= 0` se
   reprovado ou se ocorreu erro de execucao — util para orquestracao
   (ex: um node "Execute Command" no n8n pode checar o exit code).

Em qualquer um dos casos (aprovado, reprovado ou erro de execucao) um
comentario e postado na issue do Jira informada.

## Premissas assumidas nesta primeira versao

- **CPU**: comparada com o total de nucleos logicos (`nproc` /
  `ansible_processor_vcpus`).
- **RAM**: comparada com tolerancia de 5% para baixo (`ram_min_gb * 0.95`),
  pois a memoria fisica reportada pelo SO costuma ser levemente menor que
  o valor nominal do modulo instalado.
- **Disco**: soma da capacidade total dos discos fisicos (`lsblk`, tipo
  `disk`), nao do espaco livre em filesystem. Calculado em GB decimais
  (1 GB = 1.000.000.000 bytes).
- **Dominio/SSL**: verifica se o dominio resolve para o IP do servidor e
  se ha um certificado SSL valido (nao expirado) respondendo na porta 443.
- **Fora do escopo desta versao** (podem ser adicionados depois se
  necessario): suporte a instrucoes AVX/AVX2 da CPU, validacao de IP
  publico, e verificacao de que o servidor esta na rede do provedor
  (NAT/Firewall).
- **Usuario SSH**: `root`, autenticado por senha.

## Estrutura

```
ansible.cfg
verificar_requisitos.yml       # playbook principal
vars/requisitos.yml            # tabela de requisitos por plano
templates/jira_comment.json.j2       # comentario de resultado (ADF)
templates/jira_comment_erro.json.j2  # comentario de erro de execucao (ADF)
scripts/verificar-servidor.sh  # wrapper de linha de comando
```

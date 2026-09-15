# Automação de provisionamento do ACS

Repositório com toda a automação de provisionamento de servidores para o
ACS: verificação de requisitos, instalação, e integrações de n8n/Jira.

## Estrutura

```
verificacao-requisitos/   Playbook Ansible que valida CPU/RAM/disco/domínio/SSL
                           do servidor contra o plano do cliente, e comenta o
                           resultado no card do Jira. (Ver README próprio.)

instalacao-acs/           Playbook Ansible que instala o ACS — roda depois que
                           verificacao-requisitos aprova o servidor.

automacao/
  n8n/                     Workflows do n8n (exportados em JSON).
  jira/                    Scripts/documentação da integração com o Jira.
```

## Fluxo

1. `verificacao-requisitos` valida se o servidor atende ao plano do
   cliente e comenta o resultado no Jira.
2. Se aprovado, `instalacao-acs` roda a instalação do ACS.
3. `automacao/n8n` e `automacao/jira` orquestram/disparam esses passos a
   partir de eventos (ex: novo card no Jira).

## Segurança

Nenhum segredo (senha, token, chave de licença) deve ser commitado em
texto puro. Cada subpasta documenta como tratar suas credenciais
(variáveis de ambiente, Ansible Vault, etc.) — veja o README de cada uma.

# Instalação do ACS (Ansible)

Playbooks/roles que instalam e configuram o ACS no servidor, executados
**depois** que `../verificacao-requisitos` aprovar o servidor.

## Pendente

Conteúdo ainda não migrado do servidor de produção para cá. Ao adicionar:

- Coloque o playbook principal na raiz desta pasta (ex: `instalar_acs.yml`).
- Roles em `roles/`, variáveis não sensíveis em `vars/` ou `group_vars/`.
- **Nunca** commitar senha de banco, chave de licença ou qualquer token em
  texto puro. Use `ansible-vault encrypt` para arquivos de variáveis
  sensíveis (ex: `vars/vault.yml`) ou leia de variáveis de ambiente, como
  já é feito em `../verificacao-requisitos` para as credenciais do Jira.
- Se o playbook de instalação for chamado em sequência após a verificação
  de requisitos, documente aqui o fluxo completo (ex: um script wrapper
  que roda `verificacao-requisitos` e, se aprovado, roda este playbook).

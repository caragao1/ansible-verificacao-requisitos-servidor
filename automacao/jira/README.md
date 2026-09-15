# Integração com o Jira

Scripts/configuração da integração com o Jira (fora do comentário de
resultado já feito por `../../verificacao-requisitos`).

## Pendente

Conteúdo ainda não migrado do servidor de produção para cá. Ao adicionar:

- Se for automação via API do Jira (scripts que criam/atualizam issues,
  webhooks, etc.), coloque o código aqui.
- Se for regra nativa do Jira Automation, ela não tem arquivo exportável
  — documente aqui em texto o que a regra faz e onde configurá-la
  (Project settings → Automation), já que não pode ser versionada
  diretamente.
- **Nunca** commitar API token, e-mail de conta de serviço com token
  embutido, ou URL com credenciais na query string. Use variáveis de
  ambiente, como já é feito em `../../verificacao-requisitos`.

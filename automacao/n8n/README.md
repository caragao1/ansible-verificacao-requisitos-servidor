# Workflows do n8n

Workflows exportados do n8n (JSON), usados na automação de instalação e
verificação de requisitos.

## Pendente

Conteúdo ainda não migrado do servidor de produção para cá. Ao adicionar:

- Um arquivo `.json` por workflow (exportado via UI: menu do workflow →
  Download, ou via CLI: `n8n export:workflow --id=<id> --output=arquivo.json`).
- **Antes de commitar**, confira se o JSON exportado não embute
  *credentials* (tokens, senhas de conexão) em texto puro — o n8n às vezes
  inclui apenas a referência ao nome da credencial, mas vale checar campo a
  campo. Se algum valor sensível aparecer, remova/mascare antes do commit.
- Se algum workflow depende de variáveis de ambiente do n8n (ex: URLs,
  IDs de projeto), documente essas variáveis aqui.

# Verificador de Requisitos — Web

Aplicação Next.js que verifica CPU/RAM/disco/domínio/porta 80 de um
servidor antes da instalação do ACS, com um formulário e um console de
logs em tempo real — pensada para rodar 100% no Vercel (sem depender de
nenhum servidor externo).

## Como funciona

Diferente do playbook Ansible (`../verificacao-requisitos`), esta versão
**não chama `ansible-playbook`** — funções serverless do Vercel não
executam esse tipo de processo. Em vez disso, a mesma lógica foi
reimplementada em Node.js:

- Conexão SSH direta com a biblioteca `ssh2` (sem precisar de `sshpass`).
- Coleta de CPU/RAM/disco via `nproc`, `free`, `lsblk` (mesmos comandos).
- Resolução de domínio via o módulo `dns` do Node.
- Teste de porta 80 via conexão TCP direta (`net`), sem precisar subir
  um servidor temporário nem do binário `nmap`: uma conexão recusada
  (`ECONNREFUSED`) já confirma que a porta está alcançável (só não tem
  nada escutando ainda, o que é normal pré-instalação); um timeout
  indica que está bloqueada por firewall/NAT.
- Comentário no Jira via REST API (mesmo formato ADF do playbook).

O console da tela recebe os logs via **streaming de resposta HTTP**
(equivalente ao WebSocket para esse caso de uso, mas nativo do modelo
serverless do Vercel — WebocKet persistente não roda em função
serverless).

## Segurança

- **Bloqueio por IP**: `middleware.ts` só libera acesso (páginas e API)
  para os IPs listados em `ALLOWED_IPS`. Sem essa variável configurada,
  a aplicação bloqueia tudo por padrão (fail closed).
- **Senha do servidor**: enviada via HTTPS no corpo da requisição, usada
  apenas em memória durante a verificação, nunca logada nem persistida.
- **Credenciais do Jira**: só existem como variável de ambiente no
  Vercel, nunca no código.

## Deploy no Vercel

1. No [Vercel](https://vercel.com), importe o repositório
   `caragao1/ansible-verificacao-requisitos-servidor`.
2. Em **Root Directory**, selecione a pasta `web`.
3. Em **Environment Variables**, configure (veja `.env.example`):
   - `ALLOWED_IPS` — ex: `45.174.128.1`
   - `JIRA_BASE_URL`, `JIRA_EMAIL`, `JIRA_API_TOKEN` (opcional, só
     necessário se for usar a opção "Comentar no Jira")
4. Deploy. O Vercel detecta automaticamente que é um projeto Next.js.

## Rodando localmente

```bash
cd web
npm install
cp .env.example .env.local   # preencha os valores
npm run dev
```

Acesse `http://localhost:3000`. Localmente o `middleware.ts` também
aplica o bloqueio por IP — se `ALLOWED_IPS` não incluir `127.0.0.1`
(ou o IP que o Next.js enxergar em dev), adicione-o em `.env.local`
temporariamente para testar.

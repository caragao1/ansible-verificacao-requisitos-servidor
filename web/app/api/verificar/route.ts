import { NextRequest } from "next/server";
import { conectarSSH, executarComando } from "@/lib/ssh";
import { resolverDominio, checarPorta, type EstadoPorta } from "@/lib/rede";
import { selecionarFaixa, TOLERANCIA_RAM } from "@/lib/requisitos";
import { comentarNoJira } from "@/lib/jira";

export const runtime = "nodejs";
export const maxDuration = 60;

interface Payload {
  ip: string;
  porta: number;
  senha: string;
  dispositivos: number;
  dominio: string;
  comentarJira: boolean;
  jiraIssueKey?: string;
}

export async function POST(request: NextRequest) {
  const encoder = new TextEncoder();
  let payload: Payload;
  try {
    payload = await request.json();
  } catch {
    return new Response("JSON invalido.\n", { status: 400 });
  }

  const stream = new ReadableStream({
    async start(controller) {
      const log = (linha: string) => {
        controller.enqueue(encoder.encode(linha + "\n"));
      };

      try {
        await executarVerificacao(payload, log);
      } catch (err) {
        log(`ERRO: ${err instanceof Error ? err.message : String(err)}`);
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      "X-Content-Type-Options": "nosniff",
    },
  });
}

async function executarVerificacao(
  payload: Payload,
  log: (linha: string) => void
) {
  const { ip, porta, senha, dispositivos, dominio, comentarJira, jiraIssueKey } =
    payload;

  if (!ip || !porta || !senha || !dispositivos || !dominio) {
    log(
      "ERRO: parametros obrigatorios ausentes (ip, porta, senha, dispositivos, dominio)."
    );
    return;
  }
  if (comentarJira && !jiraIssueKey) {
    log(
      "ERRO: numero da issue do Jira e obrigatorio quando 'Comentar no Jira' esta marcado."
    );
    return;
  }

  log(`Verificando faixa de requisitos para ${dispositivos} dispositivos...`);
  const faixa = selecionarFaixa(dispositivos);
  if (!faixa) {
    log(
      `ERRO: quantidade de dispositivos (${dispositivos}) excede a maior faixa suportada (100.000).`
    );
    return;
  }
  log(
    `Faixa aplicada: ate ${faixa.maxDispositivos} dispositivos (CPU >= ${faixa.cpuMin}, RAM >= ${faixa.ramMinGb} GB, Disco >= ${faixa.discoMinGb} GB)`
  );

  log(`Conectando via SSH em ${ip}:${porta}...`);
  const conn = await conectarSSH({
    host: ip,
    port: porta,
    username: "root",
    password: senha,
  });
  log("Conexao SSH estabelecida.");

  const falhas: string[] = [];

  try {
    log("Coletando numero de nucleos de CPU...");
    const cpuResult = await executarComando(conn, "nproc");
    const cpuAtual = parseInt(cpuResult.stdout.trim(), 10) || 0;
    log(`CPU: ${cpuAtual} nucleo(s)`);
    if (cpuAtual < faixa.cpuMin) {
      falhas.push(
        `CPU: servidor possui ${cpuAtual} nucleo(s), minimo exigido e ${faixa.cpuMin}.`
      );
    }

    log("Coletando memoria RAM...");
    // Usa /proc/meminfo em vez de "free": e uma interface do kernel, nao
    // muda com o idioma/locale do sistema (o "free" localizado em pt_BR
    // imprime "Mem.:" em vez de "Mem:", o que quebrava o parser).
    const ramResult = await executarComando(
      conn,
      "awk '/^MemTotal:/{print $2}' /proc/meminfo"
    );
    const ramKb = parseInt(ramResult.stdout.trim(), 10) || 0;
    const ramAtualGb = Math.round((ramKb / 1_048_576) * 10) / 10;
    log(`RAM: ${ramAtualGb} GB`);
    if (ramAtualGb < faixa.ramMinGb * TOLERANCIA_RAM) {
      falhas.push(
        `Memoria RAM: servidor possui aprox. ${ramAtualGb} GB, minimo exigido e ${faixa.ramMinGb} GB.`
      );
    }

    log("Coletando capacidade de disco...");
    const discoResult = await executarComando(
      conn,
      `lsblk -b -d -n -o SIZE,TYPE | awk '$2=="disk"{sum+=$1} END{print sum+0}'`
    );
    const discoBytes = parseInt(discoResult.stdout.trim(), 10) || 0;
    const discoAtualGb = Math.round((discoBytes / 1_000_000_000) * 10) / 10;
    log(`Disco: ${discoAtualGb} GB`);
    if (discoAtualGb < faixa.discoMinGb) {
      falhas.push(
        `Disco: servidor possui ${discoAtualGb} GB, minimo exigido e ${faixa.discoMinGb} GB.`
      );
    }

    log(`Resolvendo dominio ${dominio}...`);
    const ipsResolvidos = await resolverDominio(dominio);
    log(
      ipsResolvidos.length
        ? `Dominio resolve para: ${ipsResolvidos.join(", ")}`
        : "Dominio nao resolveu para nenhum IP."
    );
    if (!ipsResolvidos.includes(ip)) {
      falhas.push(
        `Dominio: ${dominio} nao resolveu para o IP do servidor (${ip}).`
      );
    }

    // Testar a porta 80 apenas com uma tentativa crua de conexao TCP nao
    // distingue um firewall que rejeita (REJECT, parece igual a "fechado,
    // nada escutando") de um que so libera de verdade — os dois bloqueariam
    // o desafio HTTP-01 do Let's Encrypt do mesmo jeito. Por isso, como no
    // playbook Ansible, sobe um servidor HTTP de teste real no alvo e
    // confirma que ELE especificamente fica acessivel de fora.
    log("Subindo servidor HTTP temporario na porta 80 para teste...");
    const start = await executarComando(
      conn,
      "setsid nohup python3 -m http.server 80 </dev/null >/tmp/http_test_80.log 2>&1 & echo $!"
    );
    const pid = start.stdout.trim();

    try {
      let estadoPorta80: EstadoPorta = "filtered";
      for (let tentativa = 0; tentativa < 3; tentativa++) {
        await new Promise((resolve) => setTimeout(resolve, 1000));
        estadoPorta80 = await checarPorta(ip, 80, 4000);
        if (estadoPorta80 === "open") break;
      }
      log(`Porta 80: ${estadoPorta80}`);
      if (estadoPorta80 !== "open") {
        falhas.push(
          "Porta 80: nao esta acessivel externamente (necessaria para o Let's Encrypt emitir o certificado SSL na instalacao)."
        );
      }
    } finally {
      if (pid) {
        await executarComando(conn, `kill ${pid} 2>/dev/null || true`);
      }
      log("Servidor HTTP temporario encerrado.");
    }
  } finally {
    conn.end();
    log("Conexao SSH encerrada.");
  }

  const sucesso = falhas.length === 0;
  const linhasComentario = sucesso
    ? [
        "Verificacao de requisitos: APROVADO",
        `Plano verificado: ate ${faixa.maxDispositivos} dispositivos`,
        `Dominio: ${dominio} resolve corretamente para o servidor`,
        "Porta 80: acessivel externamente",
      ]
    : [
        "Verificacao de requisitos: REPROVADO",
        `Plano verificado: ate ${faixa.maxDispositivos} dispositivos`,
        "Motivo(s):",
        ...falhas,
      ];

  log("");
  log(sucesso ? "RESULTADO: APROVADO" : "RESULTADO: REPROVADO");
  if (!sucesso) {
    falhas.forEach((f) => log(` - ${f}`));
  }

  if (comentarJira && jiraIssueKey) {
    log(`Comentando resultado na issue ${jiraIssueKey}...`);
    try {
      const resposta = await comentarNoJira(jiraIssueKey, linhasComentario);
      log(
        resposta.ok
          ? "Comentario postado no Jira com sucesso."
          : `ERRO ao comentar no Jira (status ${resposta.status}).`
      );
    } catch (err) {
      log(
        `ERRO ao comentar no Jira: ${err instanceof Error ? err.message : String(err)}`
      );
    }
  }
}

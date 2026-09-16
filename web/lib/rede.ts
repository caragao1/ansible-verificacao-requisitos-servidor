import { promises as dns } from "dns";
import net from "net";

export async function resolverDominio(dominio: string): Promise<string[]> {
  try {
    return await dns.resolve4(dominio);
  } catch {
    return [];
  }
}

export type EstadoPorta = "open" | "closed" | "filtered";

/**
 * Testa a porta 80 do servidor a partir da rede da funcao serverless
 * (equivalente a "de fora"), sem precisar subir um servidor HTTP
 * temporario no alvo nem depender do binario nmap:
 * - conexao aceita          -> "open" (algo ja esta escutando)
 * - ECONNREFUSED             -> "closed" (porta alcancavel, nada escutando —
 *                                suficiente para o desafio HTTP-01 do certbot
 *                                funcionar quando o ACS for instalado)
 * - timeout / outros erros   -> "filtered" (bloqueada por firewall/NAT)
 */
export function checarPorta(
  host: string,
  port: number,
  timeoutMs = 5000
): Promise<EstadoPorta> {
  return new Promise((resolve) => {
    const socket = new net.Socket();
    let resolvido = false;

    const finalizar = (estado: EstadoPorta) => {
      if (resolvido) return;
      resolvido = true;
      socket.destroy();
      resolve(estado);
    };

    socket.setTimeout(timeoutMs);
    socket.once("connect", () => finalizar("open"));
    socket.once("timeout", () => finalizar("filtered"));
    socket.once("error", (err: NodeJS.ErrnoException) => {
      if (err.code === "ECONNREFUSED") {
        finalizar("closed");
      } else {
        finalizar("filtered");
      }
    });

    socket.connect(port, host);
  });
}

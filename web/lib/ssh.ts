import { Client } from "ssh2";

export interface SshConfig {
  host: string;
  port: number;
  username: string;
  password: string;
}

export interface ExecResult {
  stdout: string;
  stderr: string;
  code: number | null;
}

export function conectarSSH(config: SshConfig): Promise<Client> {
  return new Promise((resolve, reject) => {
    const conn = new Client();
    conn
      .on("ready", () => resolve(conn))
      .on("error", (err) => reject(err))
      .connect({
        host: config.host,
        port: config.port,
        username: config.username,
        password: config.password,
        readyTimeout: 15000,
        // Servidores recem-provisionados podem nao ter a chave no known_hosts
        // do lado do control node; aqui nao ha known_hosts persistente mesmo,
        // entao aceitamos o handshake normalmente (equivalente ao
        // StrictHostKeyChecking=no usado no playbook Ansible).
      });
  });
}

export function executarComando(
  conn: Client,
  comando: string
): Promise<ExecResult> {
  return new Promise((resolve, reject) => {
    conn.exec(comando, (err, stream) => {
      if (err) {
        reject(err);
        return;
      }
      let stdout = "";
      let stderr = "";
      stream
        .on("close", (code: number | null) => {
          resolve({ stdout, stderr, code });
        })
        .on("data", (data: Buffer) => {
          stdout += data.toString();
        })
        .stderr.on("data", (data: Buffer) => {
          stderr += data.toString();
        });
    });
  });
}

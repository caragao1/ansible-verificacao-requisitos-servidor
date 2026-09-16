"use client";

import { useRef, useState, type FormEvent } from "react";

export default function Home() {
  const [ip, setIp] = useState("");
  const [porta, setPorta] = useState("22");
  const [senha, setSenha] = useState("");
  const [dispositivos, setDispositivos] = useState("");
  const [dominio, setDominio] = useState("");
  const [comentarJira, setComentarJira] = useState(false);
  const [jiraIssueKey, setJiraIssueKey] = useState("");
  const [logs, setLogs] = useState<string[]>([]);
  const [rodando, setRodando] = useState(false);
  const consoleRef = useRef<HTMLPreElement>(null);

  function rolarConsoleParaBaixo() {
    queueMicrotask(() => {
      consoleRef.current?.scrollTo(0, consoleRef.current.scrollHeight);
    });
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setLogs([]);
    setRodando(true);

    try {
      const resposta = await fetch("/api/verificar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ip,
          porta: Number(porta),
          senha,
          dispositivos: Number(dispositivos),
          dominio,
          comentarJira,
          jiraIssueKey: comentarJira ? jiraIssueKey : undefined,
        }),
      });

      if (!resposta.body) {
        setLogs((prev) => [...prev, "ERRO: resposta sem corpo de streaming."]);
        return;
      }

      const reader = resposta.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const linhas = buffer.split("\n");
        buffer = linhas.pop() ?? "";
        if (linhas.length) {
          setLogs((prev) => [...prev, ...linhas]);
          rolarConsoleParaBaixo();
        }
      }
      if (buffer) {
        setLogs((prev) => [...prev, buffer]);
        rolarConsoleParaBaixo();
      }
    } catch (err) {
      setLogs((prev) => [
        ...prev,
        `ERRO: ${err instanceof Error ? err.message : String(err)}`,
      ]);
    } finally {
      setRodando(false);
    }
  }

  return (
    <main className="container">
      <h1>Verificador de Requisitos — ACS</h1>
      <p>Confere CPU, RAM, disco, domínio e porta 80 antes da instalação.</p>

      <form onSubmit={handleSubmit} className="form">
        <div className="campo">
          <label htmlFor="ip">IP do servidor</label>
          <input
            id="ip"
            required
            value={ip}
            onChange={(e) => setIp(e.target.value)}
            placeholder="203.0.113.10"
          />
        </div>

        <div className="campo">
          <label htmlFor="porta">Porta SSH</label>
          <input
            id="porta"
            required
            type="number"
            value={porta}
            onChange={(e) => setPorta(e.target.value)}
          />
        </div>

        <div className="campo">
          <label htmlFor="senha">Senha (root)</label>
          <input
            id="senha"
            required
            type="password"
            value={senha}
            onChange={(e) => setSenha(e.target.value)}
            autoComplete="off"
          />
        </div>

        <div className="campo">
          <label htmlFor="dispositivos">Quantidade de dispositivos (plano)</label>
          <input
            id="dispositivos"
            required
            type="number"
            value={dispositivos}
            onChange={(e) => setDispositivos(e.target.value)}
            placeholder="3000"
          />
        </div>

        <div className="campo">
          <label htmlFor="dominio">Domínio</label>
          <input
            id="dominio"
            required
            value={dominio}
            onChange={(e) => setDominio(e.target.value)}
            placeholder="acs.cliente.com.br"
          />
        </div>

        <div className="campo checkbox">
          <label>
            <input
              type="checkbox"
              checked={comentarJira}
              onChange={(e) => setComentarJira(e.target.checked)}
            />
            Comentar resultado no Jira
          </label>
        </div>

        {comentarJira && (
          <div className="campo">
            <label htmlFor="jiraIssueKey">Issue do Jira</label>
            <input
              id="jiraIssueKey"
              required={comentarJira}
              value={jiraIssueKey}
              onChange={(e) => setJiraIssueKey(e.target.value)}
              placeholder="PROJ-123"
            />
          </div>
        )}

        <button type="submit" disabled={rodando}>
          {rodando ? "Verificando..." : "Verificar"}
        </button>
      </form>

      <h2>Console</h2>
      <pre className="console" ref={consoleRef}>
        {logs.length ? logs.join("\n") : "Aguardando execução..."}
      </pre>
    </main>
  );
}

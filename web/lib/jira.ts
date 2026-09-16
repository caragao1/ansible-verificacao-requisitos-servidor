export async function comentarNoJira(
  issueKey: string,
  linhas: string[]
): Promise<{ ok: boolean; status: number; corpo: string }> {
  const baseUrl = process.env.JIRA_BASE_URL;
  const email = process.env.JIRA_EMAIL;
  const apiToken = process.env.JIRA_API_TOKEN;

  if (!baseUrl || !email || !apiToken) {
    throw new Error(
      "Variaveis de ambiente JIRA_BASE_URL, JIRA_EMAIL e JIRA_API_TOKEN nao configuradas."
    );
  }

  const body = {
    body: {
      type: "doc",
      version: 1,
      content: linhas.map((linha) => ({
        type: "paragraph",
        content: [{ type: "text", text: linha }],
      })),
    },
  };

  const auth = Buffer.from(`${email}:${apiToken}`).toString("base64");

  const resposta = await fetch(
    `${baseUrl}/rest/api/3/issue/${encodeURIComponent(issueKey)}/comment`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Basic ${auth}`,
      },
      body: JSON.stringify(body),
    }
  );

  const corpo = await resposta.text();
  return { ok: resposta.ok, status: resposta.status, corpo };
}

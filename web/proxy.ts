import { NextRequest, NextResponse } from "next/server";

// IPs autorizados a acessar a aplicação inteira (paginas + API).
// Definido via variavel de ambiente ALLOWED_IPS no Vercel, separado por virgula.
// Ex: ALLOWED_IPS=45.174.128.1
function getAllowedIps(): string[] {
  const raw = process.env.ALLOWED_IPS || "";
  return raw
    .split(",")
    .map((ip) => ip.trim())
    .filter(Boolean);
}

function getClientIp(request: NextRequest): string | null {
  const forwardedFor = request.headers.get("x-forwarded-for");
  if (forwardedFor) {
    return forwardedFor.split(",")[0].trim();
  }
  const realIp = request.headers.get("x-real-ip");
  if (realIp) {
    return realIp.trim();
  }
  return null;
}

export function proxy(request: NextRequest) {
  const allowedIps = getAllowedIps();

  // Sem lista configurada, bloqueia tudo por seguranca (fail closed) em vez
  // de deixar aberto por engano caso a env var nao tenha sido definida.
  if (allowedIps.length === 0) {
    return new NextResponse("Acesso nao configurado (ALLOWED_IPS ausente).", {
      status: 503,
    });
  }

  const clientIp = getClientIp(request);

  if (!clientIp || !allowedIps.includes(clientIp)) {
    return new NextResponse("Acesso negado.", { status: 403 });
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};

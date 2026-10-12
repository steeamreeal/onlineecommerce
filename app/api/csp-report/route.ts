import { NextResponse } from "next/server";

// Recebe violações da CSP (modo report-only) e as registra nos logs. Sem
// persistência de propósito: é só para observar o que a política bloquearia
// antes de ativá-la de verdade. Corpo limitado para não virar vetor de log.
const LIMITE_BYTES = 8 * 1024;

export async function POST(req: Request) {
  const texto = (await req.text()).slice(0, LIMITE_BYTES);
  console.warn("CSP (report-only) violação:", texto);
  return new NextResponse(null, { status: 204 });
}

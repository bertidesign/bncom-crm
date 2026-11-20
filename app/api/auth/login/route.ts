import { NextRequest, NextResponse } from "next/server";
import { getDatabase } from "@/lib/store";
import { setSession } from "@/lib/auth";
import { verifyPassword, publicUser } from "@/lib/password";
import { apiError } from "@/lib/http";
const attempts = new Map<string, { count: number; resetAt: number }>();
export async function POST(request: NextRequest) {
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || request.headers.get("x-real-ip") || "unknown";
  const now = Date.now(); const current = attempts.get(ip); if (current && current.resetAt > now && current.count >= 12) return NextResponse.json({ error: "Troppi tentativi. Riprova tra qualche minuto." }, { status: 429 }); if (!current || current.resetAt <= now) attempts.set(ip, { count: 1, resetAt: now + 10 * 60 * 1000 }); else current.count += 1;
  const body = await request.json().catch(() => null);
  if (!body || typeof body.email !== "string" || typeof body.password !== "string") return NextResponse.json({ error: "Inserisci email e password." }, { status: 400 });
  try {
    const user = (await getDatabase()).users.find(item => item.email.toLowerCase() === body.email.trim().toLowerCase() && item.active);
    if (!user || !verifyPassword(body.password, user.passwordHash)) return NextResponse.json({ error: "Email o password non corretti." }, { status: 401 });
    const response = NextResponse.json({ ok: true, user: publicUser(user) }); setSession(response, user.id); return response;
  } catch (error) { console.error("[auth/login]", error); const message = error instanceof Error ? error.message.replace(/postgres(?:ql)?:\/\/[^\s]+/gi, "[DATABASE_REDACTED]").slice(0, 240) : "Errore backend non identificato."; return NextResponse.json({ error: `Accesso non disponibile: ${message}` }, { status: 503 }); }
}

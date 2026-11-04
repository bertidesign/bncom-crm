import { NextRequest, NextResponse } from "next/server";
import { getDatabase } from "@/lib/store";
import { setSession } from "@/lib/auth";
import { verifyPassword, publicUser } from "@/lib/password";
import { apiError } from "@/lib/http";
export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null);
  if (!body || typeof body.email !== "string" || typeof body.password !== "string") return NextResponse.json({ error: "Inserisci email e password." }, { status: 400 });
  try {
    const user = (await getDatabase()).users.find(item => item.email.toLowerCase() === body.email.trim().toLowerCase() && item.active);
    if (!user || !verifyPassword(body.password, user.passwordHash)) return NextResponse.json({ error: "Email o password non corretti." }, { status: 401 });
    const response = NextResponse.json({ ok: true, user: publicUser(user) }); setSession(response, user.id); return response;
  } catch (error) { return apiError(error); }
}

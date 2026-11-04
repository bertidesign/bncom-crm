import { NextRequest, NextResponse } from "next/server";
import { setSession, validPassword } from "@/lib/auth";
export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null);
  if (!body || typeof body.password !== "string" || !validPassword(body.password)) return NextResponse.json({ error: "Password non corretta." }, { status: 401 });
  const response = NextResponse.json({ ok: true }); setSession(response); return response;
}

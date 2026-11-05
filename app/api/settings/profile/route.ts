import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth";
import { updateDatabase } from "@/lib/store";
import { apiError } from "@/lib/http";
import { hashPassword, publicUser, verifyPassword } from "@/lib/password";
const schema = z.object({ jobTitle: z.string().trim().max(100).optional(), name: z.string().trim().min(2).max(80), email: z.string().trim().email().max(160), currentPassword: z.string().max(200).optional(), newPassword: z.string().min(10).max(200).optional() });
export async function PATCH(request: NextRequest) {
  try { const actor = await getCurrentUser(); if (!actor) return NextResponse.json({ error: "Accedi di nuovo." }, { status: 401 }); const parsed = schema.safeParse(await request.json().catch(() => null)); if (!parsed.success) return NextResponse.json({ error: "Controlla nome, email e password (almeno 10 caratteri)." }, { status: 400 }); const { result } = await updateDatabase(db => { const user = db.users.find(item => item.id === actor.id); if (!user) throw new Error("Account non trovato"); const { name, email, jobTitle, currentPassword, newPassword } = parsed.data; if ((newPassword || email.toLowerCase() !== user.email.toLowerCase()) && (!currentPassword || !verifyPassword(currentPassword, user.passwordHash))) return { error: "Inserisci la password attuale corretta per cambiare email o password." }; if (db.users.some(item => item.id !== user.id && item.email.toLowerCase() === email.toLowerCase())) return { error: "Questa email è già associata a un altro account." }; if (jobTitle !== undefined) user.jobTitle = jobTitle; user.name = name; user.email = email.toLowerCase(); if (newPassword) user.passwordHash = hashPassword(newPassword); return { user: publicUser(user) }; }); if ("error" in result) return NextResponse.json({ error: result.error }, { status: 400 }); return NextResponse.json(result); } catch (error) { return apiError(error); }
}

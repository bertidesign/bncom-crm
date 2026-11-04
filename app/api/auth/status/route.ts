import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { getDatabase } from "@/lib/store";
import { apiError } from "@/lib/http";
export async function GET() { try { const user = await getCurrentUser(); const studio = user ? (await getDatabase()).studio : undefined; return NextResponse.json({ authenticated: Boolean(user), user, studio }); } catch (error) { return apiError(error); } }

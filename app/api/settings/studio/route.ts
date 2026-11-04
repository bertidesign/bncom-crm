import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireAdmin, apiError } from "@/lib/http";
import { updateDatabase } from "@/lib/store";
const schema = z.object({ name: z.string().trim().min(2).max(80), tagline: z.string().trim().max(120), contactEmail: z.union([z.literal(""), z.string().trim().email().max(160)]), logo: z.string().max(400000), workdayHours: z.number().min(1).max(12) });
function validLogo(logo: string) { if (!logo) return true; if (!/^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/]+=*$/.test(logo)) return false; const data = Buffer.from(logo.split(",")[1], "base64"); return logo.startsWith("data:image/png;") ? data.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10])) : logo.startsWith("data:image/jpeg;") ? data[0] === 255 && data[1] === 216 && data[2] === 255 : data.toString("ascii",0,4) === "RIFF" && data.toString("ascii",8,12) === "WEBP"; }
export async function PATCH(request: NextRequest) {
  try { const auth = await requireAdmin(); if (auth.response) return auth.response; if (Number(request.headers.get("content-length")) > 450000) return NextResponse.json({ error: "Immagine troppo grande." }, { status: 413 }); const parsed = schema.safeParse(await request.json().catch(() => null)); if (!parsed.success || !validLogo(parsed.data.logo)) return NextResponse.json({ error: "Controlla i dati dello studio e il marchio (PNG, JPEG o WebP)." }, { status: 400 }); await updateDatabase(db => { db.studio = parsed.data; }); return NextResponse.json({ studio: parsed.data }); } catch (error) { return apiError(error); }
}

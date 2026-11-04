import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireAdmin, apiError } from "@/lib/http";
import { getDatabase, updateDatabase } from "@/lib/store";
import { decodeLogo, removeLogo, uploadLogo } from "@/lib/blob-storage";
const schema = z.object({ name: z.string().trim().min(2).max(80), tagline: z.string().trim().max(120), contactEmail: z.union([z.literal(""), z.string().trim().email().max(160)]), logo: z.string().max(400000), workdayHours: z.number().min(1).max(12) });
export async function PATCH(request: NextRequest) {
  try {
    const auth = await requireAdmin(); if (auth.response) return auth.response;
    if (Number(request.headers.get("content-length")) > 450000) return NextResponse.json({ error: "Immagine troppo grande." }, { status: 413 });
    const parsed = schema.safeParse(await request.json().catch(() => null));
    if (!parsed.success) return NextResponse.json({ error: "Controlla i dati dello studio." }, { status: 400 });
    const fields = parsed.data;
    const previous = (await getDatabase()).studio;
    const image = fields.logo.startsWith("data:") ? decodeLogo(fields.logo) : null;
    if (fields.logo && !image && fields.logo !== previous.logo) return NextResponse.json({ error: "Marchio non valido. Usa PNG, JPEG o WebP." }, { status: 400 });
    if (fields.logo.startsWith("data:") && !image) return NextResponse.json({ error: "Immagine non valida." }, { status: 400 });
    if (image && !process.env.BLOB_READ_WRITE_TOKEN) return NextResponse.json({ error: "Storage file non disponibile. Verifica il collegamento di store-crm al progetto Vercel." }, { status: 503 });
    // Upload once, outside the database mutator (which may retry on conflicts).
    const uploaded = image ? await uploadLogo(image) : null;
    const { result } = await updateDatabase(db => {
      if (db.studio.logo !== previous.logo) return { conflict: true as const };
      const oldPath = db.studio.logoPath;
      db.studio = { ...fields, ...(uploaded || (fields.logo && oldPath ? { logoPath: oldPath } : {})) };
      return { studio: db.studio, oldPath };
    });
    if ("conflict" in result) {
      if (uploaded) await removeLogo(uploaded.logoPath);
      return NextResponse.json({ error: "Il marchio è stato aggiornato da un altro amministratore. Ricarica le impostazioni." }, { status: 409 });
    }
    if (result.oldPath && result.oldPath !== result.studio.logoPath) await removeLogo(result.oldPath);
    return NextResponse.json({ studio: result.studio });
  } catch (error) { return apiError(error); }
}

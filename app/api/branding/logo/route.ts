import { NextResponse } from "next/server";
import { getDatabase } from "@/lib/store";
import { readLogo } from "@/lib/blob-storage";
export const runtime = "nodejs";
export async function GET() {
  try {
    // Only the current studio mark is intentionally public for the login page.
    // No user-supplied pathname is accepted by this endpoint.
    const { studio } = await getDatabase();
    if (!studio.logoPath) return new NextResponse(null, { status: 404 });
    const result = await readLogo(studio.logoPath);
    if (!result || result.statusCode !== 200) return new NextResponse(null, { status: 404 });
    if (!["image/png", "image/jpeg", "image/webp"].includes(result.blob.contentType)) return new NextResponse(null, { status: 415 });
    return new NextResponse(result.stream, { headers: { "Content-Type": result.blob.contentType, "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff" } });
  } catch { console.error("Impossibile leggere il marchio da Blob."); return new NextResponse(null, { status: 503 }); }
}

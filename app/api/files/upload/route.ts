import { NextRequest, NextResponse } from "next/server";
import { handleUpload, type HandleUploadBody } from "@vercel/blob/client";
import { getCurrentUser } from "@/lib/auth";
import { getDatabase } from "@/lib/store";
import { blobCredentials, completeFile } from "@/lib/project-files";
import { validContext } from "@/lib/collaboration";
export async function POST(request: NextRequest) {
  try {
    const body = await request.json() as HandleUploadBody;
    const response = await handleUpload({ body, request, ...blobCredentials(),
      onBeforeGenerateToken: async (pathname, clientPayload) => {
        const user = await getCurrentUser(); if (!user) throw new Error("Sessione scaduta.");
        const db = await getDatabase(); const ticket = db.pendingUploads.find(item => item.id === clientPayload && item.uploadedBy === user.id && item.blobPath === pathname);
        if (!ticket || !validContext(db, ticket.projectId, ticket.taskId)) throw new Error("Caricamento non autorizzato o scaduto.");
        return { allowedContentTypes: [ticket.contentType], maximumSizeInBytes: ticket.size, validUntil: Date.parse(ticket.expiresAt), addRandomSuffix: false, allowOverwrite: false, tokenPayload: JSON.stringify({ id: ticket.id, path: ticket.blobPath }) };
      },
      onUploadCompleted: async ({ blob, tokenPayload }) => { const payload = JSON.parse(tokenPayload || "{}"); if (typeof payload.id !== "string" || payload.path !== blob.pathname) throw new Error("Caricamento non valido."); await completeFile(payload.id, blob.pathname); }
    });
    return NextResponse.json(response);
  } catch { return NextResponse.json({ error: "Caricamento non autorizzato o non disponibile. Riprova." }, { status: 400 }); }
}

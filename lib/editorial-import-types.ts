import type { ClientPost } from "@/lib/client-domain";
export type EditorialPlan = { id: string; clientId: string; name: string; createdAt: string; updatedAt: string };
export type ImportedPostData = Pick<ClientPost, "title" | "channel" | "format" | "status" | "date" | "time" | "copy" | "assetUrl" | "approver" | "notes">;
export type ImportRow = { sourceKey: string; sourceRef: string; sheet: string; data: ImportedPostData; warnings: string[] };
export type ImportSheet = { name: string; layout: string; rows: ImportRow[]; warnings: string[]; skipped: number };
export type ImportPreview = { fileName: string; sheets: ImportSheet[] };
export type ImportSource = { planId: string; key: string; sheet: string; reference: string; fileName: string; importedAt: string };

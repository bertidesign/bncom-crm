import type { ImportSource } from "@/lib/editorial-import-types";
import type { Client, Department, Project, WorkEntry } from "@/lib/types";
export const serviceCategories = {
  Web: ["Hosting", "Dominio", "Manutenzione", "Licenza plugin", "Sito web", "Altro"],
  Social: ["Gestione social", "Piano editoriale", "Campagna advertising", "Community management", "Altro"],
  Grafica: ["Identità visiva", "Grafica ricorrente", "Stampa", "Impaginazione", "Altro"]
} as const;
export const serviceStatuses = ["In attivazione", "Attivo", "In pausa", "Terminato"] as const;
export const postStatuses = ["Idea", "In preparazione", "In approvazione", "Programmato", "Pubblicato"] as const;
export type ClientService = { id: string; clientId: string; department: Department; category: string; name: string; status: typeof serviceStatuses[number]; provider: string; packageName: string; url: string; startDate: string; nextDate: string; dateKind: "Rinnovo" | "Consegna" | "Scadenza"; cadence: "Mensile" | "Trimestrale" | "Semestrale" | "Annuale" | "Una tantum" | "Personalizzata"; notes: string; createdAt: string; updatedAt: string };
export type ClientPost = { importSource?: ImportSource; id: string; clientId: string; title: string; channel: string; format: "Post" | "Carosello" | "Reel" | "Storia" | "Video" | "Altro"; status: typeof postStatuses[number]; date: string; time: string; copy: string; assetUrl: string; approver: string; notes: string; createdAt: string; updatedAt: string };
export type DepartmentMeta = { updatedAt: string; updatedBy: string };
export type ClientWebInfo = DepartmentMeta & { websiteUrl: string; cms: string; stagingUrl: string; repositoryUrl: string; technicalContact: string; maintenanceNotes: string; notes: string };
export type ClientSocialInfo = DepartmentMeta & { channels: { id: string; label: string; url: string; handle: string }[]; objectives: string; targetAudience: string; toneOfVoice: string; publishingFrequency: string; editorialPlanUrl: string; approvalContact: string; reportingNotes: string; notes: string };
export type ClientGraphicsInfo = DepartmentMeta & { brandGuideUrl: string; assetsFolderUrl: string; primaryFont: string; secondaryFont: string; colorPalette: string; preferredFormats: string; printSupplier: string; approvalContact: string; productionNotes: string; notes: string };
export type ClientDossier = { clientId: string; web: ClientWebInfo; social: ClientSocialInfo; graphics: ClientGraphicsInfo };
export type ClientPageData = { client: Client; dossier: ClientDossier; services: ClientService[]; posts: ClientPost[]; projects: Project[]; entries: WorkEntry[] };
export const dossierKeys = { Web: "web", Social: "social", Grafica: "graphics" } as const;
export function emptyDossier(clientId: string): ClientDossier {
  const meta = { updatedAt: "", updatedBy: "" };
  return { clientId, web: { ...meta, websiteUrl: "", cms: "", stagingUrl: "", repositoryUrl: "", technicalContact: "", maintenanceNotes: "", notes: "" }, social: { ...meta, channels: [], objectives: "", targetAudience: "", toneOfVoice: "", publishingFrequency: "", editorialPlanUrl: "", approvalContact: "", reportingNotes: "", notes: "" }, graphics: { ...meta, brandGuideUrl: "", assetsFolderUrl: "", primaryFont: "", secondaryFont: "", colorPalette: "", preferredFormats: "", printSupplier: "", approvalContact: "", productionNotes: "", notes: "" } };
}
export function clientPath(id: string, department?: Department) { return `/clienti/${encodeURIComponent(id)}${department ? `?reparto=${encodeURIComponent(department)}` : ""}`; }
export function shortDate(value: string) { if (!value) return "Da definire"; const date = new Date(`${value}T12:00:00`); return Number.isNaN(date.getTime()) ? value : new Intl.DateTimeFormat("it-IT", { day: "numeric", month: "short", year: "numeric" }).format(date); }
export function dateOffset(value: string, offset: number) { const date = new Date(`${value}T12:00:00Z`); date.setUTCDate(date.getUTCDate() + offset); return date.toISOString().slice(0, 10); }

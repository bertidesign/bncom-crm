import type { ImportSource } from "@/lib/editorial-import-types";
import type { Client, Department, Project, WorkEntry } from "@/lib/types";
export const serviceCategories = {
  Web: ["Hosting", "Dominio", "Manutenzione", "Licenza plugin", "Sito web", "Altro"],
  Social: ["Gestione social", "Piano editoriale", "Campagna advertising", "Community management", "Altro"],
  Grafica: ["Identità visiva", "Grafica ricorrente", "Stampa", "Impaginazione", "Altro"],
  Commerciale: ["Lead generation", "Sviluppo commerciale", "Preventivo", "Partnership", "Altro"],
  PubblicitaEditoriale: ["Banner pubblicitari", "Campagna display", "Sponsorizzazione contenuti", "Pacchetto multi-testata", "Altro"]
} as const;
export const serviceStatuses = ["In attivazione", "Attivo", "In pausa", "Terminato"] as const;
export const postStatuses = ["Idea", "In preparazione", "In approvazione", "Programmato", "Pubblicato"] as const;
export type ClientService = { providerId?: string; id: string; clientId: string; department: Department; category: string; name: string; status: typeof serviceStatuses[number]; provider: string; packageName: string; url: string; startDate: string; nextDate: string; dateKind: "Rinnovo" | "Consegna" | "Scadenza"; cadence: "Mensile" | "Trimestrale" | "Semestrale" | "Annuale" | "Una tantum" | "Personalizzata"; notes: string; createdAt: string; updatedAt: string };
export type ClientPost = { importSource?: ImportSource; id: string; clientId: string; title: string; channel: string; format: "Post" | "Carosello" | "Reel" | "Storia" | "Video" | "Altro"; status: typeof postStatuses[number]; date: string; time: string; copy: string; assetUrl: string; approver: string; notes: string; createdAt: string; updatedAt: string };
export type DepartmentMeta = { updatedAt: string; updatedBy: string };
export type ClientWebInfo = DepartmentMeta & { websiteUrl: string; cms: string; stagingUrl: string; repositoryUrl: string; technicalContact: string; maintenanceNotes: string; newsletterLog?: string; notes: string };
export type ClientSocialInfo = DepartmentMeta & { channels: { id: string; label: string; url: string; handle: string }[]; objectives: string; targetAudience: string; toneOfVoice: string; publishingFrequency: string; planPostsPerWeek?: string; planPostsPerMonth?: string; contentFormats?: string; sponsoredBudget?: string; editorialPlanUrl: string; approvalContact: string; reportingNotes: string; brandPositioning?: string; competitors?: string; contentPillars?: string; visualReferences?: string; approvalWorkflow?: string; conversionGoal?: string; notes: string };
export type ClientGraphicsInfo = DepartmentMeta & { brandGuideUrl: string; assetsFolderUrl: string; primaryFont: string; secondaryFont: string; colorPalette: string; preferredFormats: string; printSupplier: string; approvalContact: string; productionNotes: string; notes: string };
export type ClientCommercialInfo = DepartmentMeta & { accountManager: string; pipelineStatus: string; opportunityNotes: string; quoteUrl: string; nextContactDate: string; notes: string };
export type ClientMassMediaInfo = DepartmentMeta & { newspaperSites: string; advertisingContact: string; bannerFormats: string; campaignNotes: string; mediaKitUrl: string; notes: string };
export type ClientDossier = { clientId: string; web: ClientWebInfo; social: ClientSocialInfo; graphics: ClientGraphicsInfo; commercial: ClientCommercialInfo; massMedia: ClientMassMediaInfo };
export type ClientPageData = { client: Client; dossier: ClientDossier; services: ClientService[]; posts: ClientPost[]; projects: Project[]; entries: WorkEntry[] };
export const dossierKeys = { Web: "web", Social: "social", Grafica: "graphics", Commerciale: "commercial", PubblicitaEditoriale: "massMedia" } as const;
export function emptyDossier(clientId: string): ClientDossier {
  const meta = { updatedAt: "", updatedBy: "" };
  return { clientId, web: { ...meta, websiteUrl: "", cms: "", stagingUrl: "", repositoryUrl: "", technicalContact: "", maintenanceNotes: "", notes: "" }, social: { ...meta, channels: [], objectives: "", targetAudience: "", toneOfVoice: "", publishingFrequency: "", editorialPlanUrl: "", approvalContact: "", reportingNotes: "", brandPositioning: "", competitors: "", contentPillars: "", visualReferences: "", approvalWorkflow: "", conversionGoal: "", notes: "" }, graphics: { ...meta, brandGuideUrl: "", assetsFolderUrl: "", primaryFont: "", secondaryFont: "", colorPalette: "", preferredFormats: "", printSupplier: "", approvalContact: "", productionNotes: "", notes: "" }, commercial: { ...meta, accountManager: "", pipelineStatus: "", opportunityNotes: "", quoteUrl: "", nextContactDate: "", notes: "" }, massMedia: { ...meta, newspaperSites: "", advertisingContact: "", bannerFormats: "", campaignNotes: "", mediaKitUrl: "", notes: "" } };
}
export function clientPath(id: string, department?: Department) { return `/clienti/${encodeURIComponent(id)}${department ? `?reparto=${encodeURIComponent(department)}` : ""}`; }
export function shortDate(value: string) { if (!value) return "Da definire"; const date = new Date(`${value}T12:00:00`); return Number.isNaN(date.getTime()) ? value : new Intl.DateTimeFormat("it-IT", { day: "numeric", month: "short", year: "numeric" }).format(date); }
export function dateOffset(value: string, offset: number) { const date = new Date(`${value}T12:00:00Z`); date.setUTCDate(date.getUTCDate() + offset); return date.toISOString().slice(0, 10); }

// Keep distinct historic package details available as notes until the unified form is saved.
export function serviceNotes(service: Pick<ClientService, "name" | "category" | "packageName" | "notes">) {
  const compact = (value: string) => value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLocaleLowerCase("it-IT").replace(/[\s.,;:/_()–—-]+/g, " ").trim();
  const withoutCategory = (value: string) => { const normalized = compact(value); const category = compact(service.category); return normalized.startsWith(category + " ") ? normalized.slice(category.length + 1) : normalized; };
  const details = service.packageName?.trim(); const notes = service.notes || "";
  if (!details || withoutCategory(details) === withoutCategory(service.name)) return notes;
  const legacy = `Dettagli del pacchetto precedente: ${details}`;
  return notes.includes(legacy) ? notes : [notes, legacy].filter(Boolean).join("\n\n");
}

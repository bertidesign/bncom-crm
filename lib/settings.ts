import type { Notification } from "@/lib/types";

export const palettes = {
  salvia: { name: "Salvia", accent: "#3f6b5b", paper: "#f7f6f2" },
  oceano: { name: "Oceano", accent: "#285f87", paper: "#f3f6f8" },
  iris: { name: "Iris", accent: "#69568c", paper: "#f6f4f8" },
  terracotta: { name: "Terracotta", accent: "#93533c", paper: "#faf5f1" },
  grafite: { name: "Grafite", accent: "#45515d", paper: "#f4f5f6" }
} as const;
export type UserPreferences = {
  palette: keyof typeof palettes;
  density: "comfortable" | "compact";
  startPage: "La mia giornata" | "Panoramica" | "Clienti" | "Progetti" | "Lavorazioni";
  notifications: Record<Notification["entityType"], boolean> & { mentions: boolean; workflow: boolean };
};
export type CalendarEvent = { uid: string; title: string; date: string; endDate?: string; time?: string; location?: string; description?: string; clientId?: string; briefing?: string; debriefing?: string; assigneeIds?: string[]; locationType?: "studio" | "fuori-studio"; source: "icloud" };
export type CalendarConnection = { provider: "icloud"; account: string; appPasswordCiphertext: string; calendarUrl?: string; mode: "read" | "two-way"; connectedAt: string; lastSyncAt?: string; status?: "connected" | "error"; events?: CalendarEvent[] };
export type StudioSettings = { name: string; tagline: string; contactEmail: string; logo: string; logoPath?: string; workdayHours: number; calendarConnection?: CalendarConnection };
export const defaultPreferences: UserPreferences = { palette: "salvia", density: "comfortable", startPage: "Panoramica", notifications: { project: true, milestone: true, task: true, service: true, mentions: true, workflow: true } };
export const defaultStudio: StudioSettings = { name: "BNCom Studio", tagline: "Spazio di lavoro", contactEmail: "", logo: "", workdayHours: 8 };
export function preferencesFor(value?: Partial<UserPreferences>): UserPreferences {
  return { ...defaultPreferences, ...value, notifications: { ...defaultPreferences.notifications, ...value?.notifications } };
}

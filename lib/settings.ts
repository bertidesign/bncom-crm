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
  startPage: "Panoramica" | "Clienti" | "Progetti" | "Lavorazioni";
  notifications: Record<Notification["entityType"], boolean>;
};
export type StudioSettings = { name: string; tagline: string; contactEmail: string; logo: string; logoPath?: string; workdayHours: number };
export const defaultPreferences: UserPreferences = { palette: "salvia", density: "comfortable", startPage: "Panoramica", notifications: { project: true, milestone: true, task: true } };
export const defaultStudio: StudioSettings = { name: "BNCom Studio", tagline: "Spazio di lavoro", contactEmail: "", logo: "", workdayHours: 8 };
export function preferencesFor(value?: Partial<UserPreferences>): UserPreferences {
  return { ...defaultPreferences, ...value, notifications: { ...defaultPreferences.notifications, ...value?.notifications } };
}

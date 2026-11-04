import { z } from "zod";
import { departments } from "@/lib/types";
import { validDate } from "@/lib/project-templates";
export const taskFields = z.object({
  milestoneId: z.string().nullable().transform(value => value || "").optional(),
  title: z.string().trim().min(2).max(160), description: z.string().trim().max(1000).default(""),
  dueDate: z.string().refine(value => !value || validDate(value), "Scadenza non valida").default(""),
  status: z.enum(["Da fare", "In corso", "Bloccato", "Completato"]).default("Da fare"),
  assigneeIds: z.array(z.string()).max(50).transform(ids => [...new Set(ids)]).default([]),
  departmentId: z.union([z.enum(departments), z.literal("")]).transform(value => value || undefined).optional(),
  dependsOnIds: z.array(z.string()).max(60).transform(ids => [...new Set(ids)]).default([])
});

import { NextResponse } from "next/server";
import { requireSession, apiError } from "@/lib/http";
import { getDatabase } from "@/lib/store";

export async function GET() {
  try {
    const denied = await requireSession();
    if (denied) return denied;
    const db = await getDatabase();
    const packages = new Map<string, { name: string; department: string; category: string; count: number }>();
    for (const service of db.clientServices) {
      const name = service.name.trim();
      if (!name) continue;
      const key = `${service.department}\u0000${service.category}\u0000${name.toLocaleLowerCase("it-IT")}`;
      const current = packages.get(key);
      packages.set(key, current ? { ...current, count: current.count + 1 } : { name, department: service.department, category: service.category, count: 1 });
    }
    return NextResponse.json({ packages: [...packages.values()].sort((a, b) => a.name.localeCompare(b.name, "it")) });
  } catch (error) {
    return apiError(error);
  }
}

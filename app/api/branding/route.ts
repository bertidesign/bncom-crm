import { NextResponse } from "next/server";
import { getDatabase } from "@/lib/store";
import { apiError } from "@/lib/http";
export async function GET() { try { const { studio } = await getDatabase(); return NextResponse.json({ name: studio.name, tagline: studio.tagline, logo: studio.logo, workdayHours: studio.workdayHours }); } catch (error) { return apiError(error); } }

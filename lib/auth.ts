import { createHmac, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { getDatabase } from "@/lib/store";
import type { PublicUser } from "@/lib/types";
import { publicUser } from "@/lib/password";
const COOKIE = "bncom_session";
const TTL = 60 * 60 * 24 * 7;
function secret() { return process.env.SESSION_SECRET || (process.env.NODE_ENV === "development" ? "development-only-change-this-secret-before-deploy-123456" : ""); }
function sign(value: string) { return createHmac("sha256", secret()).update(value).digest("hex"); }
export async function getCurrentUser(): Promise<PublicUser | null> {
  const token = (await cookies()).get(COOKIE)?.value;
  if (!token || !secret()) return null;
  const [userId, expiry, signature] = token.split(".");
  if (!userId || !expiry || !signature || Number(expiry) < Date.now()) return null;
  const expected = sign(`${userId}.${expiry}`);
  if (signature.length !== expected.length || !timingSafeEqual(Buffer.from(signature), Buffer.from(expected))) return null;
  const user = (await getDatabase()).users.find(item => item.id === userId && item.active);
  return user ? publicUser(user) : null;
}
export async function isAuthenticated() { return Boolean(await getCurrentUser()); }
export function setSession(response: NextResponse, userId: string) {
  const expiry = String(Date.now() + TTL * 1000);
  const payload = `${userId}.${expiry}`;
  response.cookies.set(COOKIE, `${payload}.${sign(payload)}`, { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax", path: "/", maxAge: TTL });
}
export function clearSession(response: NextResponse) { response.cookies.set(COOKIE, "", { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax", path: "/", maxAge: 0 }); }

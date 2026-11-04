import { createHmac, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
const COOKIE = "bncom_session";
const TTL = 60 * 60 * 24 * 7;
function secret() { return process.env.SESSION_SECRET || (process.env.NODE_ENV === "development" ? "development-only-change-this-secret-before-deploy-123456" : ""); }
function sign(value: string) { return createHmac("sha256", secret()).update(value).digest("hex"); }
export async function isAuthenticated() {
  const token = (await cookies()).get(COOKIE)?.value;
  if (!token || !secret()) return false;
  const [expiry, signature] = token.split(".");
  if (!expiry || !signature || Number(expiry) < Date.now()) return false;
  const expected = sign(expiry);
  return signature.length === expected.length && timingSafeEqual(Buffer.from(signature), Buffer.from(expected));
}
export function setSession(response: NextResponse) {
  const expiry = String(Date.now() + TTL * 1000);
  response.cookies.set(COOKIE, `${expiry}.${sign(expiry)}`, { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax", path: "/", maxAge: TTL });
}
export function clearSession(response: NextResponse) { response.cookies.set(COOKIE, "", { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax", path: "/", maxAge: 0 }); }
export function validPassword(password: string) {
  const expected = process.env.CRM_PASSWORD || (process.env.NODE_ENV === "development" ? "bncom-demo" : "");
  const a = Buffer.from(password); const b = Buffer.from(expected);
  return Boolean(expected) && a.length === b.length && timingSafeEqual(a, b);
}

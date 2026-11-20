import { NextRequest, NextResponse } from "next/server";

export function middleware(request: NextRequest) {
  if (process.env.VERCEL_ENV !== "production") return NextResponse.next();
  const country = request.headers.get("x-vercel-ip-country")?.toUpperCase();
  if (country === "IT") return NextResponse.next();
  if (request.nextUrl.pathname.startsWith("/api/")) return NextResponse.json({ error: "Accesso disponibile solo dall'Italia." }, { status: 403 });
  return new NextResponse("Accesso disponibile solo dall'Italia.", { status: 403, headers: { "Content-Type": "text/plain; charset=utf-8", "X-Robots-Tag": "noindex" } });
}

export const config = { matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"] };

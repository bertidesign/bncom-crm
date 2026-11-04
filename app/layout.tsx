import type { Metadata } from "next";
import "./globals.css";
export const metadata: Metadata = { title: "BNCom · Spazio di lavoro", description: "Clienti, progetti e lavorazioni BNCom." };
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) { return <html lang="it"><body>{children}</body></html>; }

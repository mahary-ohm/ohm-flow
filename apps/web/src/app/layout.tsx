import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "OhmFlow | Centre de support",
  description: "Espace interne de suivi des demandes Ohm Énergie.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="fr"><body>{children}</body></html>;
}

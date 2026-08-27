import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = { title: "Envantra | Diler Holding BT Envanter", description: "Çok lokasyonlu BT varlık, ağ altyapısı ve zimmet yönetimi" };

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="tr"><body>{children}</body></html>;
}

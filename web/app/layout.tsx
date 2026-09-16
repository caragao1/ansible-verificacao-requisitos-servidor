import "./globals.css";
import type { ReactNode } from "react";

export const metadata = {
  title: "Verificador de Requisitos - ACS",
  description:
    "Verifica se um servidor atende aos requisitos minimos antes da instalacao do ACS",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="pt-BR">
      <body>{children}</body>
    </html>
  );
}

import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "CortexLab — Revisão Sistemática Editorial (PRISMA 2020 + Cochrane RoB 2)",
  description:
    "Plataforma multiagente de amplificação cognitiva para revisões sistemáticas de literatura. Mineração federada OpenAlex/PubMed, auditoria metodológica RoB 2 e síntese PRISMA com proveniência linha por linha.",
  keywords: [
    "Human Augmentation",
    "Scientific Research",
    "Multi-Agent",
    "LangGraph",
    "PRISMA 2020",
    "Cochrane RoB 2",
    "Systematic Review",
    "OpenAlex",
    "Europe PMC",
    "Crossref",
  ],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="pt-BR">
      <body className="bg-[#FAF9F6] text-slate-900 min-h-screen selection:bg-blue-100 selection:text-blue-900">
        {children}
      </body>
    </html>
  );
}

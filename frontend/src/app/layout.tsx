import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "CortexLab — Revisão Sistemática & Human Augmentation | Laboratório Multi-Agente 3D",
  description:
    "Plataforma acadêmica multi-agente para amplificação cognitiva na pesquisa científica. Laboratório espacial 3D, mineração federada OpenAlex/PubMed, auditoria RoB 2 e síntese PRISMA 2020.",
  keywords: [
    "Human Augmentation",
    "Scientific Research",
    "Multi-Agent",
    "LangGraph",
    "PRISMA 2020",
    "Systematic Review",
    "OpenAlex",
    "Europe PMC",
    "FastAPI",
  ],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="pt-BR">
      <body className="bg-[#F8FAFC] text-slate-900 min-h-screen selection:bg-blue-100 selection:text-blue-900 antialiased">
        {children}
      </body>
    </html>
  );
}

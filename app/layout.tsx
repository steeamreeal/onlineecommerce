import type { Metadata } from "next";
import { Geist, Geist_Mono, Lora } from "next/font/google";
import "./globals.css";
import { TrpcProvider } from "@/lib/trpc/provider";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const lora = Lora({
  variable: "--font-heading",
  subsets: ["latin"],
});

// `icons` não é definido aqui: app/favicon.ico (convenção de arquivo) já
// cobre o painel/admin/auth por padrão. Definir `icons.icon` explícito
// neste metadata (herdado por toda rota) impedia app/(public-store)/loja/
// [slug]/icon.tsx — a convenção de ícone por rota da loja — de aparecer no
// <head>, então a logo do lojista nunca virava favicon da vitrine pública.
export const metadata: Metadata = {
  title: "Online E-commerce",
  description: "Plataforma SaaS para lojistas venderem online",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="pt-BR"
      className={`${geistSans.variable} ${geistMono.variable} ${lora.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <TrpcProvider>
          <TooltipProvider>
            {children}
            <Toaster />
          </TooltipProvider>
        </TrpcProvider>
      </body>
    </html>
  );
}

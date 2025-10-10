import type { Metadata } from "next";
import "@/components/globals.css";
import Image from "next/image";
import Izt from "../public/LogoOro.png";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Guías Online",
  description: "Repositorio de apoyo para extraordinarios",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es" suppressHydrationWarning>
      <body className="bg-[#D4D4D4]">
        <header className="flex items-center bg-[#012243] text-white flex-col md:flex-row p-4 gap-4">
          <Link href="/" className="flex-shrink-0">
            <Image src={Izt} alt="LogoOro" height={100} priority />
          </Link>
          <h1 className="text-xl md:text-2xl text-center font-bold uppercase">
            TutorIA - Guías Online para Extraordinarios
          </h1>
        </header>
        <main className="flex-1">{children}</main>
        <footer className="bg-[#003865] text-white py-4 mt-auto">
          <div className="container mx-auto px-4 text-center">
            <p className="text-sm md:text-base">
              Facultad de Estudios Superiores Iztacala 2025
            </p>
          </div>
        </footer>
      </body>
    </html>
  );
}

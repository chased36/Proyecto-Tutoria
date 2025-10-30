import type { Metadata } from "next";
import "@/components/globals.css";
import Image from "next/image";
import Izt from "../public/LogoBlanco.png";
import Meta from "../public/MetaversoBlanco.png";
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
        <header className="flex items-center bg-[#012243] text-white flex-col md:flex-row p-4 md:justify-between">
          <Link href="/" className="flex-shrink-0">
            <Image src={Izt} alt="Logo" height={100} priority />
          </Link>
          <h1 className="text-xl md:text-2xl text-center font-bold">
            TutorIA - GUÍAS INTELIGENTES PARA EXAMEN EXTRAORDINARIO
          </h1>
          <Image src={Meta} alt="Metaverso" height={100} priority />
        </header>
        <main className="flex-1">{children}</main>
        <footer className="bg-[#003865] text-white py-4 mt-auto">
          <div className="container mx-auto px-4 text-center">
            <p className="text-sm md:text-base">
              <span>
                2025, Metaverso UNAM, Facultad de Estudios Superiores Iztacala.{" "}
              </span>
              <a
                href="https://www.iztacala.unam.mx/documentos/AvisodePrivacidadIntegral_V_DPE_02_2024.pdf"
                className="hover:underline ml-2 font-bold"
                target="_blank"
                rel="noopener noreferrer"
              >
                Aviso de Privacidad
              </a>
              <a
                href="https://metaverso.unam.mx/credtuto.html"
                className="hover:underline ml-2 font-bold"
                target="_blank"
                rel="noopener noreferrer"
              >
                Créditos
              </a>
            </p>
          </div>
        </footer>
      </body>
    </html>
  );
}

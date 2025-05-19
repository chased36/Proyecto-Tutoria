// app/layout.tsx
import type { Metadata } from "next";
import "./ui/globals.css";
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
    <html lang="es">
      <body className="bg-[#D4D4D4] font-sans">
        <header className="flex items-center bg-[#012243] text-white flex-col md:flex-row p-4 gap-4">
          <Link href="/" className="flex-shrink-0">
            <Image src={Izt} alt="LogoOro" height={100} priority />
          </Link>
          <h1 className="text-xl md:text-2xl text-center font-bold uppercase">
            Guías Online para Extraordinarios
          </h1>
        </header>
        <main>{children}</main>
      </body>
    </html>
  );
}

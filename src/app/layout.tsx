import type { Metadata } from "next";
import { Montserrat, Nunito_Sans } from "next/font/google";
import "./globals.css";

const nunito = Nunito_Sans({
  variable: "--font-nunito",
  subsets: ["latin"],
  weight: ["300", "400", "600", "700"],
});

const montserrat = Montserrat({
  variable: "--font-montserrat",
  subsets: ["latin"],
  weight: ["300", "400", "600", "700"],
});

export const metadata: Metadata = {
  title: "Facturación Electrónica",
  description: "Sistema de facturación electrónica - Inicia Factura Ya",
  icons: {
    icon: [{ url: "/favicon.ico", type: "image/x-icon" }],
    shortcut: "/favicon.ico",
    apple: "/favicon.ico",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" className={`${nunito.variable} ${montserrat.variable} h-full`} suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var d=localStorage.getItem('ify-theme')==='dark';var l=localStorage.getItem('ify-nav-locked')==='1';if(d)document.documentElement.classList.add('ify-dark');if(l)document.documentElement.classList.add('ify-nav-locked');}catch(e){}})();`,
          }}
        />
      </head>
      <body className="min-h-full antialiased">{children}</body>
    </html>
  );
}

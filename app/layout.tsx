import type { Metadata } from "next";
import { PT_Sans_Caption } from "next/font/google";
import "./globals.css";
import Providers from "./providers";

const ptSans = PT_Sans_Caption({
  subsets: ["latin"],
  weight: ["400", "700"],
  variable: "--font-pt",
});

export const metadata: Metadata = {
  title: "Jimpitan Desa Jatirejo",
  description: "Sistem iuran warga digital Desa Jatirejo",

  icons: {
    icon: "/logo-desa.png",
    shortcut: "/logo-desa.png",
    apple: "/logo-desa.png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="id"
      className={`${ptSans.variable} h-full antialiased`}
    >
      <body
        style={{
          margin: 0,
          fontFamily: "var(--font-pt)",
          background: "#f4f8ff",
        }}
      >
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
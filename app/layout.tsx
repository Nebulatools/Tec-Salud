import type React from "react"
// Root layout with ZULI branding - Archivo & Brygada 1918 fonts
import type { Metadata } from "next"
import { Archivo, Brygada_1918 } from "next/font/google"
import "./globals.css"
import { ThemeProvider } from "@/components/theme-provider"

// Primary font: Archivo - Clear, modern, professional
const archivo = Archivo({
  subsets: ["latin"],
  variable: "--font-archivo",
  display: "swap",
  weight: ["400", "500", "600", "700"],
})

// Secondary font: Brygada 1918 - Elegant, human touch
const brygada = Brygada_1918({
  subsets: ["latin"],
  variable: "--font-brygada",
  display: "swap",
  weight: ["400", "500", "600", "700"],
  style: ["normal", "italic"],
})

export const metadata: Metadata = {
  title: "ZULI - Mejores doctores, mejores pacientes",
  description: "La plataforma de IA que convierte la vida diaria en decisiones clínicas confiables",
  generator: "v0.dev",
  icons: {
    icon: "/favicon.ico",
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="es" suppressHydrationWarning>
      <body className={`${archivo.variable} ${brygada.variable} font-archivo antialiased`}>
        <ThemeProvider attribute="class" defaultTheme="light" enableSystem disableTransitionOnChange>
          {children}
        </ThemeProvider>
      </body>
    </html>
  )
}

// Patient QR Flow Layout - Minimal, mobile-first design
// No authentication required for these pages

import { ZuliLogo } from "@/components/ui/zuli-logo"

export default function PatientLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-white/80 dark:bg-slate-900/80 backdrop-blur-lg border-b border-slate-200 dark:border-slate-700">
        <div className="max-w-lg mx-auto px-4 py-3 flex items-center justify-center">
          <ZuliLogo size="sm" theme="dark" />
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-lg mx-auto px-4 py-6">
        {children}
      </main>

      {/* Footer */}
      <footer className="fixed bottom-0 left-0 right-0 bg-white/80 dark:bg-slate-900/80 backdrop-blur-lg border-t border-slate-200 dark:border-slate-700 py-3">
        <div className="max-w-lg mx-auto px-4 text-center">
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Powered by <span className="font-semibold text-zuli-indigo">ZULI</span> · Sistema de Gestión Médica
          </p>
        </div>
      </footer>
    </div>
  )
}

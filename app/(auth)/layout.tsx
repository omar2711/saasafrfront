"use client"

import type { ReactNode } from "react"
import Link from "next/link"
import { landingTheme } from "@/components/landing/cinematic-hero"
import { AuthBrandPanel } from "@/components/auth/auth-showcase"

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    // En escritorio la pantalla es fija (no hace scroll); si el formulario es largo,
    // solo scrollea el lado derecho.
    <div style={landingTheme} className="flex min-h-screen bg-white lg:h-screen lg:overflow-hidden">
      <AuthBrandPanel />

      {/* Lado derecho: formularios */}
      <div className="flex flex-1 flex-col bg-white text-[var(--paper-ink)] lg:overflow-y-auto">
        <div className="flex flex-1 items-center justify-center p-6 lg:p-10">
          <div className="w-full max-w-[26rem]">{children}</div>
        </div>
        <p className="flex items-center justify-center gap-5 px-6 pb-6 text-xs text-[var(--muted-ink)]">
          <span>&copy; 2026 GestiónPro</span>
          <Link href="/terms" className="hover:text-[var(--paper-ink)]">
            Términos
          </Link>
          <Link href="/privacy" className="hover:text-[var(--paper-ink)]">
            Privacidad
          </Link>
        </p>
      </div>
    </div>
  )
}

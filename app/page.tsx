"use client"

import Link from "next/link"
import {
  ArrowUpRight,
  Settings2,
  TrendingUp,
  UserPlus,
  type LucideIcon,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion"
import { CinematicHero, landingTheme } from "@/components/landing/cinematic-hero"
import { Reveal } from "@/components/landing/reveal"
import { FeatureCards } from "@/components/landing/feature-cards"

const steps: { icon: LucideIcon; title: string; description: string }[] = [
  {
    icon: UserPlus,
    title: "Crea tu cuenta",
    description: "Regístrate en un minuto y crea tu organización. No necesitas instalar nada.",
  },
  {
    icon: Settings2,
    title: "Configura tu negocio",
    description: "Agrega sucursales, invita a tu equipo con sus roles y carga tus productos.",
  },
  {
    icon: TrendingUp,
    title: "Vende y controla",
    description: "Registra ventas, compras e inventario, y revisa tus reportes cuando quieras.",
  },
]

const audiences = [
  "Ferreterías",
  "Distribuidoras",
  "Importadoras",
  "Comercios",
  "Constructoras",
  "Farmacias",
  "Servicios técnicos",
  "Minería e industria",
  "Energía",
  "Oficinas",
]

const faqs = [
  {
    q: "¿Necesito instalar algo?",
    a: "No. GestiónPro funciona desde el navegador, en computadora, tablet o celular. Solo necesitas conexión a internet.",
  },
  {
    q: "¿Puedo manejar más de una sucursal?",
    a: "Sí. Puedes crear varias sucursales dentro de tu organización, ver el stock de cada una y hacer transferencias entre ellas.",
  },
  {
    q: "¿Cómo controlo lo que puede hacer cada empleado?",
    a: "Con roles y permisos. Tú decides qué módulos ve cada persona y qué acciones puede realizar.",
  },
  {
    q: "¿Mis datos están separados de los de otras empresas?",
    a: "Sí. Cada organización tiene sus datos aislados de las demás.",
  },
  {
    q: "¿Cuánto cuesta?",
    a: "Hay planes según el tamaño de tu negocio. Al crear tu cuenta puedes ver las opciones disponibles.",
  },
]

/** Etiqueta en forma de píldora sobre cada título de sección */
function SectionLabel({ children, dark = false }: { children: string; dark?: boolean }) {
  return (
    <span
      className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-medium ${
        dark
          ? "border-white/15 bg-white/5 text-[var(--brand-light)]"
          : "border-[var(--brand-deep)]/20 bg-white text-[var(--brand-deep)]"
      }`}
    >
      <span
        className={`h-1.5 w-1.5 rounded-full ${dark ? "bg-[var(--brand-light)]" : "bg-[var(--brand)]"}`}
      />
      {children}
    </span>
  )
}

export default function HomePage() {
  return (
    <div
      style={landingTheme}
      className="min-h-screen bg-[var(--paper)] text-[var(--paper-ink)] selection:bg-[var(--brand)] selection:text-white"
    >
      {/* Header */}
      <header className="sticky top-0 z-50 h-16 border-b border-white/10 bg-[var(--ink)]/90 text-white backdrop-blur">
        <div className="container mx-auto flex h-full items-center justify-between px-4">
          <Link href="/" className="flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[var(--brand)] font-mono text-sm font-bold text-white">
              G
            </span>
            <span className="text-lg font-semibold tracking-tight">GestiónPro</span>
          </Link>

          <nav className="hidden items-center gap-8 text-sm text-white/65 md:flex">
            <a href="#como-funciona" className="transition-colors hover:text-white">
              Cómo funciona
            </a>
            <a href="#funciones" className="transition-colors hover:text-white">
              Funciones
            </a>
            <a href="#preguntas" className="transition-colors hover:text-white">
              Preguntas
            </a>
          </nav>

          <div className="flex items-center gap-1 sm:gap-3">
            <Button
              variant="ghost"
              asChild
              className="text-white/80 hover:bg-white/10 hover:text-white"
            >
              <Link href="/login">Iniciar sesión</Link>
            </Button>
            <Button
              asChild
              className="bg-[var(--brand)] font-semibold text-white hover:brightness-110"
            >
              <Link href="/register">Comenzar gratis</Link>
            </Button>
          </div>
        </div>
      </header>

      {/* Hero cinematográfico */}
      <CinematicHero />

      {/* Cómo funciona */}
      <section id="como-funciona" className="scroll-mt-16">
        <div className="container mx-auto px-4 py-24">
          <Reveal>
            <SectionLabel>Cómo funciona</SectionLabel>
            <h2 className="mt-5 max-w-2xl text-balance text-4xl font-semibold tracking-[-0.03em] sm:text-5xl">
              Empieza en tres pasos, sin instalar nada.
            </h2>
          </Reveal>

          <ol className="mt-14 grid gap-5 md:grid-cols-3">
            {steps.map((step, index) => (
              <Reveal key={step.title} delay={index * 0.08}>
                <li className="relative h-full overflow-hidden rounded-2xl border border-[var(--paper-ink)]/10 bg-white p-7 shadow-[0_1px_2px_rgba(0,0,0,0.04)]">
                  <span className="pointer-events-none absolute -right-2 -top-6 select-none font-mono text-[9rem] font-bold leading-none text-[var(--brand)]/[0.06]">
                    {index + 1}
                  </span>
                  <span className="relative flex h-12 w-12 items-center justify-center rounded-xl bg-[var(--brand)] text-white shadow-[0_10px_24px_-10px_var(--brand)]">
                    <step.icon className="h-6 w-6" />
                  </span>
                  <h3 className="relative mt-6 text-xl font-semibold">{step.title}</h3>
                  <p className="relative mt-2 text-[var(--muted-ink)]">{step.description}</p>
                </li>
              </Reveal>
            ))}
          </ol>
        </div>
      </section>

      {/* Funciones */}
      <section id="funciones" className="scroll-mt-16 bg-[var(--paper-2)]">
        <div className="container mx-auto px-4 py-24">
          <Reveal className="mx-auto max-w-2xl text-center">
            <SectionLabel>Funciones</SectionLabel>
            <h2 className="mt-5 text-balance text-4xl font-semibold tracking-[-0.03em] sm:text-5xl">
              Todo lo que mueve tu negocio, en un solo sistema.
            </h2>
            <p className="mt-4 text-[var(--muted-ink)]">
              Módulos pensados para el día a día de una pyme, sin herramientas separadas ni
              información repartida.
            </p>
          </Reveal>

          <div className="mt-14">
            <FeatureCards />
          </div>
        </div>
      </section>

      {/* Para quién es */}
      <section className="bg-[var(--ink)] text-white">
        <div className="container mx-auto px-4 py-24">
          <Reveal>
            <SectionLabel dark>Para quién es</SectionLabel>
            <p className="mt-8 flex flex-wrap items-baseline gap-y-2 text-4xl font-semibold leading-tight tracking-[-0.03em] sm:text-5xl lg:text-6xl">
              {audiences.map((item, index) => (
                <span key={item} className="inline-flex items-baseline">
                  <span className="cursor-default text-white/90 transition-colors hover:text-[var(--brand-light)]">
                    {item}
                  </span>
                  {index < audiences.length - 1 && (
                    <span className="mx-3 font-light text-white/20 sm:mx-5">/</span>
                  )}
                </span>
              ))}
            </p>
            <p className="mt-10 max-w-xl text-lg text-white/60">
              Si compras, vendes o manejas inventario, GestiónPro se adapta a tu forma de trabajar.
            </p>
          </Reveal>
        </div>
      </section>

      {/* Preguntas frecuentes */}
      <section id="preguntas" className="scroll-mt-16">
        <div className="container mx-auto grid gap-12 px-4 py-24 lg:grid-cols-12">
          <Reveal className="lg:col-span-4">
            <SectionLabel>Preguntas</SectionLabel>
            <h2 className="mt-5 text-balance text-4xl font-semibold tracking-[-0.03em] sm:text-5xl">
              Lo que más nos preguntan.
            </h2>
          </Reveal>
          <Reveal className="lg:col-span-8" delay={0.08}>
            <Accordion
              type="single"
              collapsible
              className="w-full rounded-2xl border border-[var(--paper-ink)]/10 bg-white px-6 shadow-[0_1px_2px_rgba(0,0,0,0.04)]"
            >
              {faqs.map((faq, index) => (
                <AccordionItem
                  key={faq.q}
                  value={`faq-${index}`}
                  className="border-[var(--paper-ink)]/10"
                >
                  <AccordionTrigger className="py-6 text-left text-base font-medium hover:no-underline sm:text-lg">
                    {faq.q}
                  </AccordionTrigger>
                  <AccordionContent className="text-base text-[var(--muted-ink)]">
                    {faq.a}
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </Reveal>
        </div>
      </section>

      {/* CTA final */}
      <section className="px-4 pb-20 pt-4">
        <Reveal className="container mx-auto">
          <div className="relative overflow-hidden rounded-3xl bg-[var(--ink)] px-6 py-16 text-center text-white sm:px-16 sm:py-24">
            <div
              aria-hidden
              className="pointer-events-none absolute inset-0"
              style={{
                backgroundImage:
                  "radial-gradient(ellipse 70% 60% at 50% 0%, oklch(0.5 0.2 258 / 0.55), transparent 70%), linear-gradient(to right, oklch(1 0 0 / 0.04) 1px, transparent 1px), linear-gradient(to bottom, oklch(1 0 0 / 0.04) 1px, transparent 1px)",
                backgroundSize: "100% 100%, 56px 56px, 56px 56px",
              }}
            />
            <div className="relative">
              <h2 className="mx-auto max-w-3xl text-balance text-4xl font-semibold tracking-[-0.03em] sm:text-6xl">
                Ordena tu negocio desde hoy.
              </h2>
              <p className="mx-auto mt-5 max-w-xl text-lg text-white/65">
                Inventario, ventas, compras y tu equipo en una sola plataforma.
              </p>
              <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
                <Button
                  size="lg"
                  asChild
                  className="bg-[var(--brand)] font-semibold text-white hover:brightness-110"
                >
                  <Link href="/register">
                    Comenzar prueba gratuita
                    <ArrowUpRight />
                  </Link>
                </Button>
                <Link
                  href="/login"
                  className="text-sm text-white/75 underline-offset-4 transition-colors hover:text-white hover:underline"
                >
                  Ya tengo cuenta
                </Link>
              </div>
            </div>
          </div>
        </Reveal>
      </section>

      {/* Footer */}
      <footer className="border-t border-[var(--paper-ink)]/10">
        <div className="container mx-auto flex flex-col items-center justify-between gap-4 px-4 py-8 text-sm text-[var(--muted-ink)] sm:flex-row">
          <p>&copy; 2026 GestiónPro. Todos los derechos reservados.</p>
          <div className="flex items-center gap-6">
            <Link href="/terms" className="transition-colors hover:text-[var(--paper-ink)]">
              Términos
            </Link>
            <Link href="/privacy" className="transition-colors hover:text-[var(--paper-ink)]">
              Privacidad
            </Link>
          </div>
        </div>
      </footer>
    </div>
  )
}

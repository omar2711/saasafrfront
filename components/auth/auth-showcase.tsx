"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { motion, useReducedMotion } from "motion/react"
import { Package, Receipt, ShieldCheck, Truck, Users, type LucideIcon } from "lucide-react"

const features: { icon: LucideIcon; title: string; description: string }[] = [
  {
    icon: Package,
    title: "Inventario y stock",
    description: "Productos, kits, stock por sucursal, transferencias y ajustes en un solo lugar.",
  },
  {
    icon: Receipt,
    title: "Ventas y cotizaciones",
    description: "Cobra, factura, gestiona devoluciones y convierte cotizaciones en ventas.",
  },
  {
    icon: Truck,
    title: "Compras y proveedores",
    description: "Órdenes de compra y recepción de mercadería directo a tu inventario.",
  },
  {
    icon: Users,
    title: "Equipo con roles y permisos",
    description: "Decide qué ve y qué puede hacer cada persona de tu equipo.",
  },
]

/** Panel informativo del lado izquierdo (solo escritorio). Ocupa el alto de la ventana, sin scroll. */
export function AuthBrandPanel() {
  const reduceMotion = useReducedMotion()
  const [active, setActive] = useState(0)

  useEffect(() => {
    if (reduceMotion) return
    const id = setInterval(() => setActive((a) => (a + 1) % features.length), 3000)
    return () => clearInterval(id)
  }, [reduceMotion])

  return (
    <div
      className="relative hidden h-full overflow-hidden text-white lg:flex lg:w-1/2 lg:flex-col lg:justify-between"
      style={{
        background:
          "radial-gradient(ellipse 80% 55% at 10% 0%, oklch(0.33 0.11 258), transparent 70%), var(--ink)",
      }}
    >
      {/* Luces suaves que se mueven despacio */}
      <motion.div
        aria-hidden
        className="pointer-events-none absolute -bottom-40 -right-32 h-[30rem] w-[30rem] rounded-full blur-3xl"
        style={{ background: "oklch(0.5 0.2 258 / 0.35)" }}
        animate={reduceMotion ? undefined : { x: [0, -60, 0], y: [0, -40, 0] }}
        transition={{ duration: 16, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.div
        aria-hidden
        className="pointer-events-none absolute -left-32 top-1/3 h-[22rem] w-[22rem] rounded-full blur-3xl"
        style={{ background: "oklch(0.55 0.17 215 / 0.18)" }}
        animate={reduceMotion ? undefined : { x: [0, 50, 0], y: [0, 30, 0] }}
        transition={{ duration: 19, repeat: Infinity, ease: "easeInOut" }}
      />

      <div className="relative z-10 p-10 pb-0 xl:p-14 xl:pb-0">
        <Link href="/" className="flex w-fit items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--brand)] font-mono text-lg font-bold shadow-[0_8px_24px_-8px_var(--brand)]">
            G
          </span>
          <span className="text-xl font-semibold tracking-tight">GestiónPro</span>
        </Link>
      </div>

      <div className="relative z-10 px-10 xl:px-14">
        <motion.div
          initial={reduceMotion ? false : { opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
        >
          <h1 className="max-w-md text-balance text-4xl font-semibold leading-[1.1] tracking-[-0.03em] xl:text-5xl">
            Gestiona tu negocio de forma inteligente
          </h1>
          <p className="mt-4 max-w-md text-pretty text-[17px] leading-relaxed text-white/60 [@media(max-height:780px)]:hidden">
            Inventario, ventas, proveedores y reportes en una sola plataforma. Toma el control de tu
            empresa desde cualquier lugar.
          </p>
        </motion.div>

        <ul className="mt-9 max-w-md space-y-1.5">
          {features.map(({ icon: Icon, title, description }, i) => {
            const isActive = active === i
            return (
              <motion.li
                key={title}
                initial={reduceMotion ? false : { opacity: 0, x: -24 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.3 + i * 0.12, duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
                onMouseEnter={() => setActive(i)}
                className="relative flex cursor-default gap-4 rounded-xl px-4 py-3.5"
              >
                {isActive && (
                  <motion.span
                    layoutId="auth-feature-highlight"
                    className="absolute inset-0 rounded-xl border border-white/10 bg-white/[0.06]"
                    transition={{ type: "spring", stiffness: 300, damping: 30 }}
                  />
                )}
                <span
                  className={`relative flex h-10 w-10 shrink-0 items-center justify-center rounded-lg transition-colors duration-500 ${
                    isActive ? "bg-[var(--brand)] text-white" : "bg-white/[0.07] text-[var(--brand-light)]"
                  }`}
                >
                  <Icon className="h-5 w-5" />
                </span>
                <span className="relative min-w-0">
                  <span className="block font-semibold">{title}</span>
                  <span
                    className={`mt-0.5 block text-sm leading-relaxed transition-colors duration-500 ${
                      isActive ? "text-white/75" : "text-white/45"
                    }`}
                  >
                    {description}
                  </span>
                </span>
              </motion.li>
            )
          })}
        </ul>
      </div>

      <div className="relative z-10 flex items-center gap-2 p-10 pt-0 text-sm text-white/50 xl:p-14 xl:pt-0">
        <ShieldCheck className="h-4 w-4 text-[var(--mint)]" />
        Cada organización tiene sus datos separados y seguros.
      </div>
    </div>
  )
}

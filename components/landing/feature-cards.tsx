"use client"

import { useEffect, useRef, useState, type MouseEvent as ReactMouseEvent } from "react"
import {
  AnimatePresence,
  motion,
  useMotionValue,
  useReducedMotion,
  useSpring,
  useTransform,
} from "motion/react"
import {
  BarChart3,
  Building2,
  FileText,
  History,
  Package,
  Receipt,
  Truck,
  Users,
  Wallet,
  type LucideIcon,
} from "lucide-react"

type Feature = {
  icon: LucideIcon
  title: string
  description: string
  tags: string[]
  wide?: boolean
  visual?: "stock" | "chart" | "log"
}

const features: Feature[] = [
  {
    icon: Package,
    title: "Inventario",
    description:
      "Productos, categorías, kits, stock por sucursal, transferencias y ajustes en un solo lugar.",
    tags: ["Kits", "Transferencias", "Ajustes"],
    wide: true,
    visual: "stock",
  },
  {
    icon: Receipt,
    title: "Punto de venta",
    description:
      "Registra ventas, cobra con distintos métodos de pago, entrega, factura y gestiona devoluciones.",
    tags: ["Cobros", "Facturas", "Devoluciones"],
  },
  {
    icon: Building2,
    title: "Multi-empresa y sucursales",
    description:
      "Administra varias organizaciones y sucursales desde una sola cuenta, con los datos de cada una separados.",
    tags: ["Sucursales", "Datos separados"],
  },
  {
    icon: Users,
    title: "Roles y permisos",
    description:
      "Define qué puede ver y hacer cada persona de tu equipo: ventas, inventario, reportes y más.",
    tags: ["Equipo", "Permisos"],
  },
  {
    icon: FileText,
    title: "Cotizaciones",
    description: "Arma cotizaciones para tus clientes y conviértelas en venta cuando las aprueben.",
    tags: ["Clientes", "A venta"],
  },
  {
    icon: Truck,
    title: "Compras y proveedores",
    description:
      "Lleva el registro de tus proveedores, crea órdenes de compra y recibe mercadería al inventario.",
    tags: ["Órdenes", "Proveedores"],
  },
  {
    icon: BarChart3,
    title: "Reportes",
    description:
      "Resúmenes de ventas, cotizaciones e inventario para decidir con datos y no con intuición.",
    tags: ["Ventas", "Cotizaciones", "Inventario"],
    wide: true,
    visual: "chart",
  },
  {
    icon: Wallet,
    title: "Caja chica",
    description:
      "Controla los ingresos y egresos menores del día a día sin perder el rastro de ningún gasto.",
    tags: ["Ingresos", "Egresos"],
  },
  {
    icon: History,
    title: "Auditoría",
    description: "Historial de las acciones del sistema: sabrás quién hizo qué y cuándo.",
    tags: ["Quién", "Qué", "Cuándo"],
    wide: true,
    visual: "log",
  },
]

const visualLabels = {
  stock: "Stock por producto",
  chart: "Ventas semanales",
  log: "Actividad en vivo",
} as const

/* ------------------------------------------------------------------ */
/* Cinta de módulos que se desplaza sola                               */
/* ------------------------------------------------------------------ */

function Marquee() {
  const reduceMotion = useReducedMotion()

  const row = (
    <div className="flex shrink-0 items-center gap-3 pr-3">
      {features.map(({ title, icon: Icon }) => (
        <span
          key={title}
          className="inline-flex items-center gap-2 rounded-full border border-[var(--paper-ink)]/10 bg-white px-4 py-2 text-sm font-medium shadow-sm"
        >
          <Icon className="h-4 w-4 text-[var(--brand)]" />
          {title}
        </span>
      ))}
    </div>
  )

  const mask = "linear-gradient(to right, transparent, black 10%, black 90%, transparent)"

  return (
    <div aria-hidden className="overflow-hidden" style={{ maskImage: mask, WebkitMaskImage: mask }}>
      <motion.div
        className="flex w-max"
        animate={reduceMotion ? undefined : { x: ["0%", "-50%"] }}
        transition={{ duration: 34, ease: "linear", repeat: Infinity }}
      >
        {row}
        {row}
      </motion.div>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* Ilustraciones animadas de las tarjetas anchas (datos de ejemplo)    */
/* ------------------------------------------------------------------ */

function StockVisual() {
  const reduceMotion = useReducedMotion()
  const bars = [
    [38, 66],
    [62, 40],
    [48, 82],
    [80, 54],
    [55, 92],
    [92, 62],
    [66, 86],
    [74, 46],
  ]

  return (
    <div className="flex h-24 items-end gap-2" aria-hidden>
      {bars.map(([from, to], i) => (
        <motion.span
          key={i}
          className={`flex-1 rounded-t-md ${i === 4 ? "bg-[var(--brand)]" : "bg-[var(--brand)]/25"}`}
          initial={{ height: `${from}%` }}
          whileInView={reduceMotion ? undefined : { height: [`${from}%`, `${to}%`] }}
          transition={{
            duration: 1.8 + i * 0.15,
            repeat: Infinity,
            repeatType: "mirror",
            ease: "easeInOut",
          }}
        />
      ))}
    </div>
  )
}

function ChartVisual() {
  const reduceMotion = useReducedMotion()
  const line = "M4 64 C 26 60, 36 34, 58 38 S 96 66, 118 34 S 160 14, 176 10"

  return (
    <svg viewBox="0 0 180 80" className="h-24 w-full" fill="none" aria-hidden>
      <motion.path
        d={`${line} L176 80 L4 80 Z`}
        fill="oklch(0.6 0.2 258 / 0.12)"
        initial={reduceMotion ? false : { opacity: 0 }}
        whileInView={{ opacity: 1 }}
        viewport={{ once: true }}
        transition={{ delay: 0.9, duration: 0.6 }}
      />
      <motion.path
        d={line}
        stroke="oklch(0.6 0.2 258)"
        strokeWidth="2.5"
        strokeLinecap="round"
        initial={reduceMotion ? false : { pathLength: 0 }}
        whileInView={{ pathLength: 1 }}
        viewport={{ once: true }}
        transition={{ duration: 1.6, ease: "easeInOut" }}
      />
      <motion.circle
        cx="176"
        cy="10"
        r="4"
        fill="oklch(0.6 0.2 258)"
        style={{ transformOrigin: "176px 10px" }}
        animate={reduceMotion ? undefined : { scale: [1, 1.8, 1], opacity: [1, 0.45, 1] }}
        transition={{ duration: 1.8, repeat: Infinity, ease: "easeInOut" }}
      />
    </svg>
  )
}

const logPool = [
  ["A", "Ana", "editó un precio"],
  ["L", "Luis", "registró una venta"],
  ["M", "Marta", "recibió una compra"],
  ["C", "Carlos", "ajustó el stock"],
  ["R", "Rosa", "creó una cotización"],
  ["D", "Diego", "cambió un rol"],
]
const logTimes = ["ahora", "hace 2 min", "hace 5 min"]

function LogVisual() {
  const reduceMotion = useReducedMotion()
  const [tick, setTick] = useState(0)

  useEffect(() => {
    if (reduceMotion) return
    const id = setInterval(() => setTick((t) => t + 1), 2400)
    return () => clearInterval(id)
  }, [reduceMotion])

  const n = logPool.length
  const visible = [0, 1, 2].map((k) => (((tick - k) % n) + n) % n)

  return (
    <ul className="space-y-2 text-xs" aria-hidden>
      <AnimatePresence initial={false} mode="popLayout">
        {visible.map((poolIndex, position) => {
          const [initial, who, what] = logPool[poolIndex]
          return (
            <motion.li
              key={poolIndex}
              layout
              initial={{ opacity: 0, y: -14 }}
              animate={{ opacity: 1 - position * 0.22, y: 0 }}
              exit={{ opacity: 0, x: 24 }}
              transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
              className="flex items-center gap-2.5 rounded-lg bg-white px-3 py-2 shadow-sm"
            >
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[var(--brand)] text-[10px] font-semibold text-white">
                {initial}
              </span>
              <span className="min-w-0 flex-1 truncate">
                <span className="font-semibold">{who}</span>{" "}
                <span className="text-[var(--muted-ink)]">{what}</span>
              </span>
              <span className="shrink-0 text-[10px] text-[var(--muted-ink)]/70">
                {logTimes[position]}
              </span>
            </motion.li>
          )
        })}
      </AnimatePresence>
    </ul>
  )
}

function VisualPanel({ kind }: { kind: NonNullable<Feature["visual"]> }) {
  return (
    <div className="rounded-xl border border-[var(--paper-ink)]/10 bg-[var(--paper)] p-4">
      <p className="mb-3 flex items-center gap-2 text-[11px] font-medium uppercase tracking-wider text-[var(--muted-ink)]">
        {kind === "log" && (
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[var(--mint)] opacity-60" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-[var(--mint)]" />
          </span>
        )}
        {visualLabels[kind]}
      </p>
      {kind === "stock" && <StockVisual />}
      {kind === "chart" && <ChartVisual />}
      {kind === "log" && <LogVisual />}
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* Tarjeta: aparece al bajar, se inclina con el mouse y tiene un foco  */
/* de luz que sigue el cursor                                          */
/* ------------------------------------------------------------------ */

function FeatureCard({ feature, index }: { feature: Feature; index: number }) {
  const reduceMotion = useReducedMotion()
  const ref = useRef<HTMLDivElement>(null)
  const px = useMotionValue(0)
  const py = useMotionValue(0)
  const rotateY = useSpring(useTransform(px, [-0.5, 0.5], [-6, 6]), { stiffness: 220, damping: 22 })
  const rotateX = useSpring(useTransform(py, [-0.5, 0.5], [6, -6]), { stiffness: 220, damping: 22 })

  const onMove = (e: ReactMouseEvent<HTMLDivElement>) => {
    const el = ref.current
    if (!el) return
    const rect = el.getBoundingClientRect()
    px.set((e.clientX - rect.left) / rect.width - 0.5)
    py.set((e.clientY - rect.top) / rect.height - 0.5)
    el.style.setProperty("--mx", `${e.clientX - rect.left}px`)
    el.style.setProperty("--my", `${e.clientY - rect.top}px`)
  }
  const onLeave = () => {
    px.set(0)
    py.set(0)
  }

  const Icon = feature.icon

  return (
    <motion.div
      ref={ref}
      initial={reduceMotion ? false : { opacity: 0, y: 44, scale: 0.96 }}
      whileInView={{ opacity: 1, y: 0, scale: 1 }}
      viewport={{ once: true, margin: "-60px" }}
      transition={{ duration: 0.7, delay: (index % 3) * 0.08, ease: [0.22, 1, 0.36, 1] }}
      style={{ perspective: 900 }}
      className={feature.wide ? "sm:col-span-2" : ""}
      onMouseMove={reduceMotion ? undefined : onMove}
      onMouseLeave={reduceMotion ? undefined : onLeave}
    >
      <motion.article
        style={reduceMotion ? undefined : { rotateX, rotateY }}
        whileHover={reduceMotion ? undefined : { y: -6 }}
        className="group relative h-full overflow-hidden rounded-2xl border border-[var(--paper-ink)]/10 bg-white p-6 shadow-[0_1px_2px_rgba(0,0,0,0.04)] transition-[border-color,box-shadow] duration-300 hover:border-[var(--brand)]/30 hover:shadow-[0_28px_56px_-28px_var(--brand)]"
      >
        {/* Foco de luz que sigue al cursor */}
        <span
          aria-hidden
          className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-300 group-hover:opacity-100"
          style={{
            background:
              "radial-gradient(340px circle at var(--mx, 50%) var(--my, 50%), oklch(0.6 0.2 258 / 0.14), transparent 65%)",
          }}
        />

        {/* Ícono grande de fondo (en un contenedor para que quede fijo en la esquina) */}
        <div
          aria-hidden
          className="pointer-events-none absolute -bottom-10 -right-8 transition-transform duration-500 group-hover:-translate-y-3 group-hover:rotate-6"
          style={{ color: "oklch(0.6 0.2 258 / 0.06)" }}
        >
          <Icon size={176} strokeWidth={1.25} />
        </div>

        <div
          className={`relative flex h-full flex-col ${
            feature.visual ? "sm:grid sm:grid-cols-[minmax(0,1fr)_minmax(0,19rem)] sm:items-center sm:gap-8" : ""
          }`}
        >
          <div className="flex h-full flex-col">
            <div className="flex items-center justify-between">
              <motion.span
                animate={reduceMotion ? undefined : { y: [0, -4, 0] }}
                transition={{
                  duration: 3 + (index % 4) * 0.4,
                  repeat: Infinity,
                  ease: "easeInOut",
                }}
                className="flex h-11 w-11 items-center justify-center rounded-xl bg-[var(--brand)]/10 text-[var(--brand-deep)] transition-colors duration-300 group-hover:bg-[var(--brand)] group-hover:text-white"
              >
                <Icon className="h-5 w-5" />
              </motion.span>
              <span className="font-mono text-xs text-[var(--muted-ink)]/60">
                {String(index + 1).padStart(2, "0")}
              </span>
            </div>

            <h3 className="mt-5 text-lg font-semibold">{feature.title}</h3>
            <p className="mt-2 max-w-md text-sm leading-relaxed text-[var(--muted-ink)]">
              {feature.description}
            </p>

            <div className="mt-auto flex flex-wrap gap-2 pt-5">
              {feature.tags.map((tag) => (
                <span
                  key={tag}
                  className="rounded-full bg-[var(--brand)]/[0.08] px-2.5 py-1 text-xs font-medium text-[var(--brand-deep)]"
                >
                  {tag}
                </span>
              ))}
            </div>
          </div>

          {feature.visual && (
            <div className="mt-6 sm:mt-0">
              <VisualPanel kind={feature.visual} />
            </div>
          )}
        </div>
      </motion.article>
    </motion.div>
  )
}

/* ------------------------------------------------------------------ */

export function FeatureCards() {
  return (
    <div>
      <Marquee />
      <div className="mt-10 grid grid-flow-dense gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {features.map((feature, index) => (
          <FeatureCard key={feature.title} feature={feature} index={index} />
        ))}
      </div>
    </div>
  )
}

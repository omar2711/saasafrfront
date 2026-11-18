"use client"

import { useEffect, useRef, type CSSProperties, type ReactNode } from "react"
import Link from "next/link"
import { ChevronDown } from "lucide-react"
import {
  motion,
  useMotionValue,
  useReducedMotion,
  useScroll,
  useSpring,
  useTransform,
  type MotionValue,
} from "motion/react"
import { Button } from "@/components/ui/button"

/* ------------------------------------------------------------------ */
/* Paleta de la landing (no toca los colores del resto del sistema)    */
/* ------------------------------------------------------------------ */
export const landingTheme = {
  "--ink": "oklch(0.16 0.04 258)",
  "--ink-2": "oklch(0.235 0.05 257)",
  "--brand": "oklch(0.6 0.2 258)",
  "--brand-light": "oklch(0.78 0.12 250)",
  "--brand-deep": "oklch(0.45 0.18 258)",
  "--mint": "oklch(0.78 0.14 160)",
  "--paper": "oklch(0.985 0.004 250)",
  "--paper-2": "oklch(0.955 0.012 250)",
  "--paper-ink": "oklch(0.2 0.04 258)",
  "--muted-ink": "oklch(0.45 0.03 255)",
} as CSSProperties

/* ------------------------------------------------------------------ */
/* Experiencia de inicio cinematográfica                               */
/*                                                                     */
/* Una escena "pegajosa" (sticky) cuyo progreso depende del scroll:    */
/*   0.00 - 0.20  Escena 1: identidad                                  */
/*   0.20 - 0.50  Escena 2: las piezas del negocio flotan en 3D        */
/*   0.50 - 0.80  Escena 3: las piezas se ordenan en el dashboard      */
/*   0.80 - 1.00  Escena 4: mensaje final y llamada a la acción        */
/*                                                                     */
/* El progreso pasa por un resorte (useSpring) para que el movimiento  */
/* sea suave aunque el scroll sea a saltos (rueda del mouse).          */
/* ------------------------------------------------------------------ */

type Scatter = {
  /** posición dispersa horizontal, fracción de la mitad del ancho de pantalla (-1 a 1) */
  fx: number
  /** posición dispersa vertical, fracción de la mitad del alto de pantalla (-1 a 1) */
  fy: number
  z: number
  rx: number
  ry: number
  rz: number
  /** cuándo empieza a aparecer (0 a 1) */
  delay: number
  /** intensidad del movimiento de profundidad (parallax) */
  depth: number
}

/* ----------------------- Caja de cartón en 3D ----------------------- */

function Cube({ progress }: { progress: MotionValue<number> }) {
  const rotateY = useTransform(progress, [0, 1], [-30, 330])
  const half = 28
  const face = "absolute inset-0 flex items-center justify-center border border-white/15"

  return (
    <div className="h-14 w-14" style={{ perspective: 500 }}>
      <motion.div
        className="relative h-full w-full"
        style={{ transformStyle: "preserve-3d", rotateX: -22, rotateY }}
      >
        <div
          className={face}
          style={{ background: "oklch(0.62 0.17 258)", transform: `translateZ(${half}px)` }}
        >
          <span className="rounded-sm bg-white/90 px-1 font-mono text-[7px] font-bold text-[var(--ink)]">
            SKU
          </span>
        </div>
        <div
          className={face}
          style={{ background: "oklch(0.5 0.16 258)", transform: `rotateY(90deg) translateZ(${half}px)` }}
        />
        <div
          className={face}
          style={{ background: "oklch(0.4 0.13 258)", transform: `rotateY(180deg) translateZ(${half}px)` }}
        />
        <div
          className={face}
          style={{ background: "oklch(0.5 0.16 258)", transform: `rotateY(-90deg) translateZ(${half}px)` }}
        />
        <div
          className={face}
          style={{ background: "oklch(0.78 0.11 252)", transform: `rotateX(90deg) translateZ(${half}px)` }}
        >
          <span className="h-full w-2 bg-black/10" />
        </div>
        <div
          className={face}
          style={{ background: "oklch(0.32 0.1 258)", transform: `rotateX(-90deg) translateZ(${half}px)` }}
        />
      </motion.div>
    </div>
  )
}

/* ------------------------- Contenido de piezas ---------------------- */

function TileFrame({
  label,
  value,
  hint,
  children,
}: {
  label: string
  value: string
  hint: string
  children?: ReactNode
}) {
  return (
    <div className="relative flex h-full flex-col justify-between overflow-hidden rounded-xl border border-white/10 bg-[var(--ink-2)] p-3 text-white shadow-[0_20px_40px_-16px_rgba(0,0,0,0.7)] sm:p-4">
      <p className="font-mono text-[9px] uppercase tracking-[0.14em] text-white/50 sm:text-[11px]">
        {label}
      </p>
      <div>
        <p className="text-lg font-semibold leading-none sm:text-2xl">{value}</p>
        <p className="mt-1 text-[10px] text-white/55 sm:text-xs">{hint}</p>
      </div>
      {children}
    </div>
  )
}

function InventoryTile({ progress }: { progress: MotionValue<number> }) {
  return (
    <TileFrame label="Inventario" value="1.248" hint="productos en stock">
      <div className="absolute right-2 top-3 origin-top-right scale-[0.7] sm:right-4 sm:top-5 sm:scale-100">
        <Cube progress={progress} />
      </div>
      <span className="absolute bottom-3 right-3 hidden rounded border border-white/15 px-1.5 py-0.5 font-mono text-[10px] text-white/60 sm:block">
        SKU-0421
      </span>
    </TileFrame>
  )
}

function SalesTile() {
  return (
    <TileFrame label="Ventas" value="Bs 48.250" hint="este mes">
      <svg
        viewBox="0 0 80 32"
        className="absolute bottom-3 right-3 hidden h-8 w-20 stroke-[var(--mint)] sm:block"
        fill="none"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden
      >
        <path d="M2 26 L16 20 L28 23 L42 12 L56 15 L68 6 L78 4" />
      </svg>
    </TileFrame>
  )
}

function PurchasesTile() {
  return (
    <TileFrame label="Compras" value="OC-218" hint="orden recibida">
      <div className="absolute right-3 top-3 hidden w-12 -rotate-6 space-y-1 rounded-sm bg-[var(--paper)] p-1.5 shadow-lg sm:block">
        <div className="h-1 w-6 rounded bg-[var(--ink)]/70" />
        <div className="h-1 w-full rounded bg-[var(--ink)]/15" />
        <div className="h-1 w-full rounded bg-[var(--ink)]/15" />
        <div className="h-1 w-8 rounded bg-[var(--ink)]/15" />
      </div>
    </TileFrame>
  )
}

function SuppliersTile() {
  return (
    <TileFrame label="Proveedores" value="24" hint="activos">
      <div className="absolute bottom-3 right-3 hidden -space-x-2 sm:flex">
        <span className="h-6 w-6 rounded-full border-2 border-[var(--ink-2)] bg-[var(--brand)]" />
        <span className="h-6 w-6 rounded-full border-2 border-[var(--ink-2)] bg-[var(--mint)]" />
        <span className="h-6 w-6 rounded-full border-2 border-[var(--ink-2)] bg-white/30" />
      </div>
    </TileFrame>
  )
}

function ReportsTile() {
  const bars = [35, 55, 42, 70, 60, 90]
  return (
    <TileFrame label="Reportes" value="+12%" hint="tendencia semanal">
      <div className="absolute bottom-3 right-3 flex h-8 items-end gap-1 sm:h-10">
        {bars.map((h, i) => (
          <span
            key={i}
            className={`w-1.5 rounded-t sm:w-2 ${
              i === bars.length - 1 ? "bg-[var(--brand-light)]" : "bg-white/25"
            }`}
            style={{ height: `${h}%` }}
          />
        ))}
      </div>
    </TileFrame>
  )
}

function UsersTile() {
  return (
    <TileFrame label="Usuarios" value="8" hint="con roles asignados">
      <div className="absolute right-3 top-3 hidden flex-col items-end gap-1 sm:flex">
        {["Admin", "Ventas", "Almacén"].map((role) => (
          <span
            key={role}
            className="rounded-full border border-white/15 px-2 py-0.5 font-mono text-[9px] text-white/65"
          >
            {role}
          </span>
        ))}
      </div>
    </TileFrame>
  )
}

/* ------------------------------ Pieza 3D ---------------------------- */

function Tile({
  progress,
  scatter,
  children,
}: {
  progress: MotionValue<number>
  scatter: Scatter
  children: ReactNode
}) {
  const slot = useRef<HTMLDivElement>(null)
  const offset = useRef({ x: 0, y: 0 })
  const { fx, fy } = scatter

  // Calcula cuánto debe alejarse la pieza de su lugar final para quedar
  // "dispersa" en la pantalla. Se recalcula cuando cambia el tamaño.
  useEffect(() => {
    const el = slot.current
    const parent = el?.offsetParent as HTMLElement | null
    if (!el || !parent) return

    const measure = () => {
      const cx = el.offsetLeft + el.offsetWidth / 2 - parent.clientWidth / 2
      const cy = el.offsetTop + el.offsetHeight / 2 - parent.clientHeight / 2
      offset.current = {
        x: fx * (window.innerWidth / 2) * 0.9 - cx,
        y: fy * (window.innerHeight / 2) - cy,
      }
    }

    measure()
    const observer = new ResizeObserver(measure)
    observer.observe(parent)
    window.addEventListener("resize", measure)
    return () => {
      observer.disconnect()
      window.removeEventListener("resize", measure)
    }
  }, [fx, fy])

  // 0 = pieza dispersa, 1 = pieza en su lugar dentro del dashboard
  const settle = useTransform(progress, [0.5, 0.82], [0, 1])
  const appear = useTransform(progress, [scatter.delay, scatter.delay + 0.12], [0, 1])

  const x = useTransform(settle, (s) => (1 - s) * offset.current.x)
  const y = useTransform(settle, (s) => (1 - s) * offset.current.y)
  const z = useTransform(settle, (s) => (1 - s) * scatter.z)
  const rotateX = useTransform(settle, (s) => (1 - s) * scatter.rx)
  const rotateY = useTransform(settle, (s) => (1 - s) * scatter.ry)
  const rotateZ = useTransform(settle, (s) => (1 - s) * scatter.rz)
  const scale = useTransform(appear, (a) => 0.6 + 0.4 * a)
  const driftY = useTransform(
    progress,
    [0, 0.5, 0.82],
    [40 * scatter.depth, -40 * scatter.depth, 0],
  )

  return (
    <motion.div
      ref={slot}
      style={{ x, y, z, rotateX, rotateY, rotateZ, scale, opacity: appear }}
      className="h-[88px] will-change-transform sm:h-[132px]"
    >
      <motion.div style={{ y: driftY }} className="h-full">
        {children}
      </motion.div>
    </motion.div>
  )
}

/* ------------------------------ Textos ------------------------------ */

function Caption({
  progress,
  input,
  output,
  children,
}: {
  progress: MotionValue<number>
  input: number[]
  output: number[]
  children: ReactNode
}) {
  const opacity = useTransform(progress, input, output)
  const y = useTransform(opacity, [0, 1], [18, 0])
  const visibility = useTransform(opacity, (o) =>
    o > 0.02 ? ("visible" as const) : ("hidden" as const),
  )

  return (
    <motion.div
      style={{ opacity, y, visibility }}
      className="absolute inset-0 flex flex-col items-center px-2"
    >
      {children}
    </motion.div>
  )
}

/* ------------------------------ Fondo ------------------------------- */
/* Sin filtros blur animados: solo degradados, que son baratos de pintar */

function Background({ progress }: { progress: MotionValue<number> }) {
  const glowY = useTransform(progress, [0, 1], ["-8%", "18%"])

  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
      <div
        className="absolute inset-0"
        style={{
          backgroundImage:
            "radial-gradient(ellipse 80% 50% at 50% -10%, oklch(0.34 0.13 258 / 0.7), transparent 70%)",
        }}
      />
      <div
        className="absolute inset-0"
        style={{
          backgroundImage:
            "linear-gradient(to right, oklch(1 0 0 / 0.035) 1px, transparent 1px), linear-gradient(to bottom, oklch(1 0 0 / 0.035) 1px, transparent 1px)",
          backgroundSize: "56px 56px",
          maskImage: "radial-gradient(ellipse at center, black, transparent 75%)",
          WebkitMaskImage: "radial-gradient(ellipse at center, black, transparent 75%)",
        }}
      />
      <motion.div
        style={{
          y: glowY,
          backgroundImage:
            "radial-gradient(closest-side, oklch(0.6 0.2 258 / 0.22), transparent)",
        }}
        className="absolute left-1/2 top-1/2 h-[80vmin] w-[80vmin] -translate-x-1/2 -translate-y-1/2 will-change-transform"
      />
      <div
        className="absolute -bottom-[10%] right-[5%] h-[50vmin] w-[50vmin]"
        style={{
          backgroundImage:
            "radial-gradient(closest-side, oklch(0.72 0.14 160 / 0.12), transparent)",
        }}
      />
    </div>
  )
}

/* --------------------------- Datos de piezas ------------------------ */

const SCATTER: Record<string, Scatter> = {
  inventory: { fx: -0.8, fy: -0.35, z: 160, rx: 35, ry: -50, rz: -14, delay: 0.02, depth: 1.2 },
  sales: { fx: 0.05, fy: -0.5, z: -220, rx: -30, ry: 40, rz: 10, delay: 0.05, depth: 0.6 },
  purchases: { fx: 0.8, fy: -0.25, z: 80, rx: 25, ry: 55, rz: 16, delay: 0.08, depth: 1 },
  suppliers: { fx: -0.7, fy: 0.3, z: -120, rx: -35, ry: -45, rz: 12, delay: 0.11, depth: 0.8 },
  reports: { fx: 0.05, fy: 0.45, z: 220, rx: 30, ry: 35, rz: -10, delay: 0.14, depth: 1.4 },
  users: { fx: 0.75, fy: 0.35, z: -60, rx: -25, ry: -55, rz: -18, delay: 0.17, depth: 0.7 },
}

/* ---------------------------- Componente ---------------------------- */

export function CinematicHero() {
  const reduceMotion = useReducedMotion()
  const sectionRef = useRef<HTMLElement>(null)
  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ["start start", "end end"],
  })
  // Suaviza el scroll: el movimiento "alcanza" al scroll con un resorte
  const smooth = useSpring(scrollYProgress, {
    stiffness: 90,
    damping: 26,
    mass: 0.6,
    restDelta: 0.0005,
  })
  const finalState = useMotionValue(1)
  // Con "reducir movimiento" se muestra directamente la escena final, sin animación.
  const progress = reduceMotion ? finalState : smooth

  const stageRotateX = useTransform(progress, [0, 0.55, 0.9], [18, 10, 0])
  const stageRotateY = useTransform(progress, [0, 0.55, 0.9], [-14, -8, 0])
  const stageScale = useTransform(progress, [0, 0.9], [0.9, 1])
  const chromeOpacity = useTransform(progress, [0.6, 0.86], [0, 1])
  const cueOpacity = useTransform(progress, [0, 0.06], [1, 0])
  const ctaVisibility = useTransform(progress, (p) =>
    p > 0.82 ? ("visible" as const) : ("hidden" as const),
  )

  return (
    <section
      ref={sectionRef}
      aria-labelledby="hero-title"
      style={landingTheme}
      className={`relative bg-[var(--ink)] text-white ${reduceMotion ? "" : "h-[400vh]"}`}
    >
      <h1 id="hero-title" className="sr-only">
        GestiónPro: plataforma de gestión empresarial para inventarios, ventas, compras, proveedores y reportes
      </h1>

      <div
        className={`relative flex flex-col items-center overflow-hidden px-4 ${
          reduceMotion
            ? "min-h-[calc(100svh-4rem)] pb-10"
            : "sticky top-16 h-[calc(100svh-4rem)]"
        }`}
      >
        <Background progress={progress} />

        {/* Textos de cada escena */}
        <div className="relative z-20 mt-6 h-[34svh] min-h-[210px] w-full max-w-3xl shrink-0 text-center sm:mt-10">
          <Caption progress={progress} input={[0, 0.12, 0.2]} output={[1, 1, 0]}>
            <span className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-3 py-1 text-xs text-white/70">
              <span className="h-1.5 w-1.5 rounded-full bg-[var(--mint)]" />
              Gestión empresarial para pymes
            </span>
            <p className="mt-6 text-balance text-4xl font-semibold tracking-[-0.03em] sm:text-7xl">
              Tu negocio, <span className="bg-gradient-to-r from-[var(--brand-light)] to-[var(--mint)] bg-clip-text text-transparent">bajo control.</span>
            </p>
            <p className="mt-4 text-sm text-white/60 sm:text-base">Desliza para descubrir cómo.</p>
          </Caption>

          <Caption progress={progress} input={[0.2, 0.3, 0.45, 0.52]} output={[0, 1, 1, 0]}>
            <p className="mt-6 font-mono text-xs uppercase tracking-[0.2em] text-[var(--brand-light)]">
              El problema
            </p>
            <p className="mt-3 text-balance text-3xl font-semibold tracking-[-0.03em] sm:text-6xl">
              Cada área, cada dato.
            </p>
            <p className="mt-4 max-w-xl text-pretty text-sm text-white/65 sm:text-lg">
              Inventario, ventas, compras, proveedores y reportes suelen vivir en lugares distintos.
            </p>
          </Caption>

          <Caption progress={progress} input={[0.5, 0.58, 0.74, 0.8]} output={[0, 1, 1, 0]}>
            <p className="mt-6 font-mono text-xs uppercase tracking-[0.2em] text-[var(--brand-light)]">
              La solución
            </p>
            <p className="mt-3 text-balance text-3xl font-semibold tracking-[-0.03em] sm:text-6xl">
              Ahora, <span className="bg-gradient-to-r from-[var(--brand-light)] to-[var(--mint)] bg-clip-text text-transparent">todo conectado.</span>
            </p>
            <p className="mt-4 max-w-xl text-pretty text-sm text-white/65 sm:text-lg">
              Una sola plataforma que ordena la operación de tu negocio.
            </p>
          </Caption>

          <Caption progress={progress} input={[0.8, 0.9, 1]} output={[0, 1, 1]}>
            <p className="text-balance text-3xl font-semibold tracking-[-0.03em] sm:text-6xl">
              Todo tu negocio, <span className="bg-gradient-to-r from-[var(--brand-light)] to-[var(--mint)] bg-clip-text text-transparent">en una sola plataforma.</span>
            </p>
            <p className="mt-3 max-w-2xl text-pretty text-sm text-white/65 sm:mt-4 sm:text-lg">
              GestiónPro reúne inventarios, ventas, compras, proveedores, usuarios y reportes para que
              administres con claridad y decidas con datos.
            </p>
            <motion.div
              style={{ visibility: ctaVisibility }}
              className="mt-5 flex flex-wrap items-center justify-center gap-3 sm:mt-6"
            >
              <Button
                size="lg"
                asChild
                className="bg-[var(--brand)] font-semibold text-white hover:brightness-110"
              >
                <a href="#funciones">Explorar plataforma</a>
              </Button>
              <Button
                size="lg"
                variant="outline"
                asChild
                className="border-white/25 bg-transparent text-white hover:bg-white/10 hover:text-white"
              >
                <Link href="/register">Comenzar</Link>
              </Button>
            </motion.div>
          </Caption>
        </div>

        {/* Escenario 3D: dashboard + piezas */}
        <div aria-hidden className="relative z-10 flex w-full flex-1 items-start justify-center pt-2">
          <div className="relative w-[min(94vw,980px)]" style={{ perspective: 1400 }}>
            <motion.div
              style={{
                opacity: chromeOpacity,
                backgroundImage:
                  "radial-gradient(closest-side, oklch(0.6 0.2 258 / 0.3), transparent)",
              }}
              className="pointer-events-none absolute -bottom-12 left-1/2 h-24 w-4/5 -translate-x-1/2"
            />

            <motion.div
              style={{
                rotateX: stageRotateX,
                rotateY: stageRotateY,
                scale: stageScale,
                transformStyle: "preserve-3d",
              }}
              className="relative will-change-transform"
            >
              {/* Marco del dashboard */}
              <motion.div
                style={{ opacity: chromeOpacity, z: -20 }}
                className="absolute inset-0 rounded-2xl border border-white/10 bg-[oklch(0.2_0.05_257)] shadow-[0_40px_80px_-30px_rgba(0,0,0,0.8)]"
              >
                <div className="flex items-center gap-1.5 border-b border-white/10 px-4 py-3">
                  <span className="h-2.5 w-2.5 rounded-full bg-white/20" />
                  <span className="h-2.5 w-2.5 rounded-full bg-white/20" />
                  <span className="h-2.5 w-2.5 rounded-full bg-white/20" />
                  <span className="ml-3 font-mono text-[10px] text-white/40 sm:text-xs">
                    panel de control · vista de ejemplo
                  </span>
                </div>
                <div className="absolute bottom-0 left-0 top-[45px] hidden w-14 flex-col items-center gap-3 border-r border-white/10 pt-4 sm:flex">
                  <span className="h-6 w-6 rounded-md bg-[var(--brand)]" />
                  {[0, 1, 2, 3, 4].map((i) => (
                    <span key={i} className="h-5 w-5 rounded bg-white/10" />
                  ))}
                </div>
              </motion.div>

              {/* Piezas */}
              <div
                className="relative pb-3 pl-3 pr-3 pt-11 sm:pb-4 sm:pl-[72px] sm:pr-4 sm:pt-12"
                style={{ transformStyle: "preserve-3d" }}
              >
                <div
                  className="relative grid grid-cols-2 gap-2 sm:grid-cols-3 sm:gap-3"
                  style={{ transformStyle: "preserve-3d" }}
                >
                  <Tile progress={progress} scatter={SCATTER.inventory}>
                    <InventoryTile progress={progress} />
                  </Tile>
                  <Tile progress={progress} scatter={SCATTER.sales}>
                    <SalesTile />
                  </Tile>
                  <Tile progress={progress} scatter={SCATTER.purchases}>
                    <PurchasesTile />
                  </Tile>
                  <Tile progress={progress} scatter={SCATTER.suppliers}>
                    <SuppliersTile />
                  </Tile>
                  <Tile progress={progress} scatter={SCATTER.reports}>
                    <ReportsTile />
                  </Tile>
                  <Tile progress={progress} scatter={SCATTER.users}>
                    <UsersTile />
                  </Tile>
                </div>
              </div>
            </motion.div>
          </div>
        </div>

        {/* Indicador de scroll */}
        {!reduceMotion && (
          <motion.div
            aria-hidden
            style={{ opacity: cueOpacity }}
            className="pointer-events-none absolute bottom-4 left-1/2 z-20 -translate-x-1/2 text-white/50"
          >
            <ChevronDown className="h-6 w-6 animate-bounce" />
          </motion.div>
        )}
      </div>
    </section>
  )
}
